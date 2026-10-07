import { storage } from "./storage";
import { createDraftStorage } from "./draftCore";
const core = createDraftStorage(storage);
const INDEX = "draft-index";
let registry = Promise.resolve();
function updateIndex(key: string, keep: boolean) {
  const result = registry
    .catch(() => undefined)
    .then(async () => {
      const keys = JSON.parse((await core.get(INDEX)) || "[]") as string[];
      const next = keep
        ? [...new Set([...keys, key])]
        : keys.filter((item) => item !== key);
      if (JSON.stringify(next) !== JSON.stringify(keys))
        await core.set(INDEX, JSON.stringify(next));
    });
  registry = result;
  return result;
}
export const draftStorage = {
  async get(key: string) {
    const value = await core.get(key);
    if (value) await updateIndex(key, true);
    return value;
  },
  async set(key: string, value: string) {
    await core.set(key, value);
    await updateIndex(key, true);
  },
  async remove(key: string) {
    await core.remove(key);
    await updateIndex(key, false);
  },
  async removeUser(userId: string) {
    await registry.catch(() => undefined);
    const keys = JSON.parse((await core.get(INDEX)) || "[]") as string[];
    for (const key of keys.filter(
      (item) =>
        item.includes("-" + userId + "-") || item.endsWith("-" + userId),
    ))
      await draftStorage.remove(key);
  },
};
