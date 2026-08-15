const key = "unicode-art-maker:cache-restore-pending";

const storage = (): Storage | null => {
  try { return window.localStorage; } catch { return null; }
};

export const beginCacheRestore = (version: string): boolean => {
  const store = storage();
  if (!store) return true;
  if (store.getItem(key) === version) {
    store.removeItem(key);
    return false;
  }
  store.setItem(key, version);
  return true;
};

export const finishCacheRestore = (version: string): void => {
  const store = storage();
  if (!store || store.getItem(key) !== version) return;
  store.removeItem(key);
};

export const clearCacheRestoreOnCleanExit = (version: string): void => {
  addEventListener("pagehide", () => finishCacheRestore(version), { once: true });
};
