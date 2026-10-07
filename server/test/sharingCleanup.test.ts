import { test } from "node:test";
import assert from "node:assert/strict";
import { undoFailedSharingStart } from "../../mobile/src/sharingCleanup.js";
const expires = "2026-10-05T17:00:00Z";
test("a failed start revokes the session, stops tracking and preserves permission guidance", async () => {
  const calls: string[] = [];
  const cause = new Error("Allow location access before starting sharing.");
  await assert.rejects(
    undoFailedSharingStart(cause, expires, {
      stopRemote: async () => {
        calls.push("remote");
      },
      stopDevice: async () => {
        calls.push("device");
      },
      refresh: async () => {
        calls.push("refresh");
      },
    }),
    (error) => error === cause,
  );
  assert.deepEqual(calls.sort(), ["device", "refresh", "remote"]);
});
test("a slow or failed server stop never prevents device cleanup", async () => {
  let release!: () => void;
  let stopped = false;
  let refreshed = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const cleanup = undoFailedSharingStart(new Error("Upload failed"), expires, {
    stopRemote: async () => {
      await gate;
      throw new Error("Offline");
    },
    stopDevice: async () => {
      stopped = true;
    },
    refresh: async () => {
      refreshed = true;
    },
  });
  const rejected = assert.rejects(
    cleanup,
    /Reconnect, open Walk, and stop the session/,
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(stopped, true);
  release();
  await rejected;
  assert.equal(refreshed, true);
});
test("failed device cleanup still revokes remote access and refreshes the walk state", async () => {
  let revoked = false;
  let refreshed = false;
  await assert.rejects(
    undoFailedSharingStart(new Error("Start failed"), expires, {
      stopRemote: async () => {
        revoked = true;
      },
      stopDevice: async () => {
        throw new Error("Device storage failed");
      },
      refresh: async () => {
        refreshed = true;
      },
    }),
    /couldn’t confirm that it fully stopped/,
  );
  assert.ok(revoked);
  assert.ok(refreshed);
});

test('stop immediately shuts down device updates even while revocation waits', async () => {
  const { stopSharedWalk } = await import('../../mobile/src/sharingCleanup.js');
  let release!: () => void;
  let deviceStopped = false;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const stop = stopSharedWalk(expires, {
    stopRemote: () => pending,
    stopDevice: async () => { deviceStopped = true; },
    refresh: async () => {},
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deviceStopped, true);
  release();
  await stop;
});
test('offline stop describes revoked-access uncertainty without claiming sharing ended', async () => {
  const { stopSharedWalk } = await import('../../mobile/src/sharingCleanup.js');
  await assert.rejects(stopSharedWalk(expires, {
    stopRemote: async () => { throw new Error('Offline'); },
    stopDevice: async () => {},
    refresh: async () => { throw new Error('Offline'); },
  }), /This device stopped sending locations\. Contact access has not been confirmed revoked/);
});
test('successful revocation with failed device cleanup gives device-specific recovery', async () => {
  const { stopSharedWalk } = await import('../../mobile/src/sharingCleanup.js');
  await assert.rejects(stopSharedWalk(expires, {
    stopRemote: async () => {},
    stopDevice: async () => { throw new Error('OS cleanup failed'); },
    refresh: async () => {},
  }), /Contact access was revoked\. Device cleanup could not be confirmed/);
});
test('refresh failure cannot replace failed-start permission guidance', async () => {
  const cause = new Error('Allow location');
  await assert.rejects(undoFailedSharingStart(cause, expires, {
    stopRemote: async () => {}, stopDevice: async () => {},
    refresh: async () => { throw new Error('Refresh failed'); },
  }), error => error === cause);
});
