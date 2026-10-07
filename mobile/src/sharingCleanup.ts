type StopActions = {
  stopRemote: () => Promise<void>;
  stopDevice: () => Promise<void>;
  refresh: () => Promise<void>;
};

export async function stopSharedWalk(expiresAt: string, actions: StopActions) {
  const [remote, device] = await Promise.allSettled([
    Promise.resolve().then(actions.stopRemote),
    Promise.resolve().then(actions.stopDevice),
  ]);
  // Refresh is useful, but must not hide the outcome of either stop operation.
  await Promise.allSettled([Promise.resolve().then(actions.refresh)]);
  if (remote.status === "rejected") {
    throw new Error(
      (device.status === "fulfilled"
        ? "This device stopped sending locations. "
        : "We couldn’t confirm that device updates stopped. ") +
        "Contact access has not been confirmed revoked. Reconnect and tap Stop sharing now again. Access expires at " +
        new Date(expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + ".",
    );
  }
  if (device.status === "rejected")
    throw new Error("Contact access was revoked. Device cleanup could not be confirmed. Close SafelyGo and disable its location permission in device settings.");
}

export async function undoFailedSharingStart(
  cause: unknown,
  expiresAt: string,
  actions: StopActions,
): Promise<never> {
  // Stop the device without waiting for a potentially slow network request.
  const results = await Promise.allSettled([
    Promise.resolve().then(actions.stopRemote),
    Promise.resolve().then(actions.stopDevice),
  ]);
  await Promise.allSettled([Promise.resolve().then(actions.refresh)]);
  if (results.some((result) => result.status === "rejected")) {
    throw new Error(
      "Sharing could not start, and we couldn’t confirm that it fully stopped. Reconnect, open Walk, and stop the session. Access ends automatically at " +
        new Date(expiresAt).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }) +
        ".",
    );
  }
  throw cause;
}
