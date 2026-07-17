import { MemoryRouter } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useHelp } from "@/hooks/useHelp";
import { getSignedStorageUrl } from "@/lib/storage/signedUrl";

vi.mock("@/lib/storage/signedUrl", () => ({
  getSignedStorageUrl: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe("useHelp featured tutorial videos", () => {
  it("ne precharge pas les vignettes tutoriels quand les medias tutoriels ne sont pas actives", () => {
    const { result } = renderHook(() => useHelp(), { wrapper });

    expect(result.current.featuredVideos).toEqual([]);
    expect(getSignedStorageUrl).not.toHaveBeenCalled();
  });
});
