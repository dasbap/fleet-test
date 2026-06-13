import { describe, expect, it } from "vitest";
import { extractStorageObjectPath } from "@/lib/storage/signedUrl";

describe("extractStorageObjectPath", () => {
  const bucket = "tutorials";

  it("extrait le chemin depuis une URL publique legacy", () => {
    const url =
      "https://proj.supabase.co/storage/v1/object/public/tutorials/thumbs/tuto-01.svg";
    expect(extractStorageObjectPath(bucket, url)).toBe("thumbs/tuto-01.svg");
  });

  it("extrait le chemin depuis une URL signée", () => {
    const url =
      "https://proj.supabase.co/storage/v1/object/sign/tutorials/videos/foo.mp4?token=abc";
    expect(extractStorageObjectPath(bucket, url)).toBe("videos/foo.mp4");
  });

  it("retourne le chemin brut si déjà relatif", () => {
    expect(extractStorageObjectPath(bucket, "thumbs/tuto-02.svg")).toBe(
      "thumbs/tuto-02.svg",
    );
  });
});
