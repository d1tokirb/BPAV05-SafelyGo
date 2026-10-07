export type DraftAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};
export function createDraftStorage(storage: DraftAdapter) {
  // Serialize writes per draft. Small encrypted chunks avoid native keychain payload limits.
  const writes = new Map<string, Promise<unknown>>();
  let revision = 0;
  type Manifest = { version: 1; prefix: string; count: number };
  async function manifest(key: string): Promise<Manifest | null> {
    const value = await storage.get(key + ".manifest");
    return value ? JSON.parse(value) : null;
  }
  function enqueue<T>(key: string, work: () => Promise<T>): Promise<T> {
    const result = (writes.get(key) || Promise.resolve())
      .catch(() => undefined)
      .then(work);
    writes.set(key, result);
    void result
      .finally(() => {
        if (writes.get(key) === result) writes.delete(key);
      })
      .catch(() => undefined);
    return result;
  }
  return {
    get(key: string) {
      return enqueue(key, async () => {
        const saved = await manifest(key);
        if (!saved) return storage.get(key); // Restore drafts written before chunking.
        const chunks = await Promise.all(
          Array.from({ length: saved.count }, (_, i) =>
            storage.get(saved.prefix + "." + i),
          ),
        );
        if (chunks.some((chunk) => chunk === null))
          throw new Error("Incomplete draft");
        return chunks.join("");
      });
    },
    set(key: string, value: string) {
      return enqueue(key, async () => {
        const previous = await manifest(key);
        const prefix = key + "." + Date.now() + "." + revision++;
        const characters = Array.from(value);
        const count = Math.ceil(characters.length / 400);
        const written: string[] = [];
        try {
          for (let i = 0; i < count; i++) {
            const chunk = prefix + "." + i;
            await storage.set(
              chunk,
              characters.slice(i * 400, (i + 1) * 400).join(""),
            );
            written.push(chunk);
          }
          await storage.set(
            key + ".manifest",
            JSON.stringify({ version: 1, prefix, count }),
          );
        } catch (error) {
          await Promise.all(written.map((chunk) => storage.remove(chunk)));
          throw error;
        }
        if (previous)
          await Promise.all(
            Array.from({ length: previous.count }, (_, i) =>
              storage.remove(previous.prefix + "." + i),
            ),
          );
        await storage.remove(key);
      });
    },
    remove(key: string) {
      return enqueue(key, async () => {
        const previous = await manifest(key);
        await storage.remove(key + ".manifest");
        await storage.remove(key);
        if (previous)
          await Promise.all(
            Array.from({ length: previous.count }, (_, i) =>
              storage.remove(previous.prefix + "." + i),
            ),
          );
      });
    },
  };
}
