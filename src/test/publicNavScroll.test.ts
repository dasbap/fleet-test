import { describe, expect, it, vi } from "vitest";
import {
  extractAnchorId,
  handlePublicAnchorNav,
  scrollToAnchorId,
} from "@/lib/navigation/publicNavScroll";

describe("publicNavScroll", () => {
  it("extrait l'id depuis /#features ou #features", () => {
    expect(extractAnchorId("/#features")).toBe("features");
    expect(extractAnchorId("#modules")).toBe("modules");
    expect(extractAnchorId("/pricing")).toBeNull();
  });

  it("scroll smooth vers l'élément cible", () => {
    const element = document.createElement("section");
    element.id = "features";
    const scrollIntoView = vi.fn();
    element.scrollIntoView = scrollIntoView;
    document.body.appendChild(element);

    scrollToAnchorId("features");

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    element.remove();
  });

  it("navigue vers /#ancre hors page d'accueil", () => {
    const navigate = vi.fn();
    handlePublicAnchorNav("/#modules", "/pricing", navigate);
    expect(navigate).toHaveBeenCalledWith("/#modules");
  });

  it("scroll sur / sans changer de route", () => {
    const element = document.createElement("section");
    element.id = "features";
    element.scrollIntoView = vi.fn();
    document.body.appendChild(element);

    const navigate = vi.fn();
    handlePublicAnchorNav("/#features", "/", navigate);

    expect(navigate).not.toHaveBeenCalled();
    expect(element.scrollIntoView).toHaveBeenCalled();
    element.remove();
  });
});
