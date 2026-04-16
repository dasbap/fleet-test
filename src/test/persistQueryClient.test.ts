import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

const isNativePlatformMock = vi.fn();
const setItemMock = vi.fn();
const getItemMock = vi.fn();
const removeItemMock = vi.fn();

vi.mock("@/lib/platform", () => ({
  isNativePlatform: () => isNativePlatformMock(),
}));

vi.mock("@/lib/storage/adapters/capacitor.storage-adapter", () => ({
  CapacitorStorageAdapter: class {
    setItem = setItemMock;
    getItem = getItemMock;
    removeItem = removeItemMock;
  },
}));

describe("getQueryPersister", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("utilise le persister web sur navigateur", async () => {
    isNativePlatformMock.mockReturnValue(false);
    const { getQueryPersister } = await import("@/lib/query/persistQueryClient");
    const persister = getQueryPersister();

    expect(persister).not.toBeNull();
    expect(typeof persister?.persistClient).toBe("function");
  });

  it("utilise le persister natif sur mobile", async () => {
    isNativePlatformMock.mockReturnValue(true);
    const { getQueryPersister } = await import("@/lib/query/persistQueryClient");
    const persister = getQueryPersister();
    const client = { buster: "", timestamp: Date.now(), clientState: {} } as PersistedClient;

    await persister?.persistClient(client);
    expect(setItemMock).toHaveBeenCalledTimes(1);

    getItemMock.mockResolvedValue(client);
    const restored = await persister?.restoreClient();
    expect(restored).toEqual(client);

    await persister?.removeClient();
    expect(removeItemMock).toHaveBeenCalledTimes(1);
  });
});
