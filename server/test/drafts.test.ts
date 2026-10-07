import { test } from "node:test";
import assert from "node:assert/strict";
import { createDraftStorage } from "../../mobile/src/draftCore.js";
function adapter() {
  const values = new Map<string, string>();
  let fail = false;
  return {
    values,
    breakWrites: (value: boolean) => {
      fail = value;
    },
    async get(key: string) {
      return values.get(key) || null;
    },
    async set(key: string, value: string) {
      assert.ok(Buffer.byteLength(value) < 2048);
      if (fail && !key.endsWith("manifest")) throw new Error("Storage full");
      await new Promise((resolve) => setTimeout(resolve, 1));
      values.set(key, value);
    },
    async remove(key: string) {
      values.delete(key);
    },
  };
}
test("long multilingual reports round-trip within native keychain payload sizes", async () => {
  const store = adapter();
  const drafts = createDraftStorage(store);
  const body = JSON.stringify({
    title: "Campus concern",
    body: "😀界é".repeat(1800),
  });
  await drafts.set("report", body);
  assert.equal(await drafts.get("report"), body);
  await drafts.remove("report");
  assert.equal(await drafts.get("report"), null);
  assert.equal(store.values.size, 0);
});
test("rapid edits and removal are serialized so stale drafts do not return", async () => {
  const store = adapter();
  const drafts = createDraftStorage(store);
  await Promise.all([
    drafts.set("report", "first"),
    drafts.set("report", "second"),
    drafts.set("report", "latest"),
  ]);
  assert.equal(await drafts.get("report"), "latest");
  await Promise.all([
    drafts.set("report", "pending edit"),
    drafts.remove("report"),
  ]);
  assert.equal(await drafts.get("report"), null);
  assert.equal(store.values.size, 0);
});
test("failed save preserves the previous complete draft", async () => {
  const store = adapter();
  const drafts = createDraftStorage(store);
  await drafts.set("report", "original");
  store.breakWrites(true);
  await assert.rejects(drafts.set("report", "changed"));
  store.breakWrites(false);
  assert.equal(await drafts.get("report"), "original");
});
test("draft migration reads old values and removes them after a successful save", async () => {
  const store = adapter();
  const drafts = createDraftStorage(store);
  store.values.set("report", "legacy draft");
  assert.equal(await drafts.get("report"), "legacy draft");
  await drafts.set("report", "new draft");
  assert.ok(!store.values.has("report"));
  assert.equal(await drafts.get("report"), "new draft");
});
