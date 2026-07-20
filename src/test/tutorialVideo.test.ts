import { describe, expect, it } from "vitest";
import {
  buildYouTubeEmbedUrl,
  detectProviderFromUrl,
  extractYouTubeId,
  extractVimeoId,
  resolveVideoSource,
} from "@/features/tutorials/lib/tutorialVideo";

describe("tutorialVideo", () => {
  it("détecte YouTube", () => {
    expect(
      detectProviderFromUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("youtube");
  });

  it("extrait l'id YouTube", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extrait l'id Vimeo", () => {
    expect(extractVimeoId("https://vimeo.com/123456789")).toBe("123456789");
  });

  it("résout une source embed YouTube", () => {
    const src = resolveVideoSource(
      "youtube",
      "",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(src.kind).toBe("youtube");
    if (src.kind === "youtube") {
      expect(src.embedUrl).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });

  it("résout du MP4 direct", () => {
    const url = "https://example.com/video.mp4";
    const src = resolveVideoSource("storage", url, null);
    expect(src.kind).toBe("html5");
    if (src.kind === "html5") {
      expect(src.src).toBe(url);
    }
  });

  it("construit l'URL embed YouTube", () => {
    expect(buildYouTubeEmbedUrl("abc12345678")).toContain("embed/abc12345678");
  });
});
