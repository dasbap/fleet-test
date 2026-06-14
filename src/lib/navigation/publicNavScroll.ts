/** Fait défiler vers une ancre de la landing (smooth par défaut). */
export function scrollToAnchorId(
  anchorId: string,
  behavior: ScrollBehavior = "smooth",
): void {
  document.getElementById(anchorId)?.scrollIntoView({ behavior, block: "start" });
}

/** Extrait l'id d'ancre depuis un href (`/#features`) ou un hash (`#features`). */
export function extractAnchorId(href: string): string | null {
  if (href.startsWith("#")) {
    const anchorId = href.slice(1);
    return anchorId.length > 0 ? anchorId : null;
  }

  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return null;
  const anchorId = href.slice(hashIndex + 1);
  return anchorId.length > 0 ? anchorId : null;
}

/**
 * Navigation ancres landing : smooth scroll sur `/`, sinon navigation React Router vers `/#id`.
 */
export function handlePublicAnchorNav(
  href: string,
  pathname: string,
  navigate: (to: string) => void,
): void {
  const anchorId = extractAnchorId(href);
  if (!anchorId) {
    navigate(href);
    return;
  }

  if (pathname === "/") {
    scrollToAnchorId(anchorId);
    window.history.replaceState(null, "", `#${anchorId}`);
    return;
  }

  navigate(`/#${anchorId}`);
}
