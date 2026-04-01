import {
  ESAMBA_DEEP_LINK_PREFIX,
  ESAMBA_DEEP_LINK_SCHEME,
} from "@/lib/deepLinks/deepLinkConfig";

/** Résultat du parsing d’un lien esamba://… */
export type ParsedDeepLink =
  | {
      ok: true;
      kind: "alerts_list";
    }
  | {
      ok: true;
      kind: "fleet_list";
    }
  | {
      ok: true;
      kind: "alert";
      alertId: string;
    }
  | {
      ok: true;
      kind: "vehicle";
      vehicleId: string;
    }
  | {
      ok: true;
      kind: "mission";
      missionId: string;
    }
  | {
      ok: true;
      kind: "intervention";
      ticketId: string;
    }
  | {
      ok: false;
      reason: string;
    };

function trimSegments(parts: string[]): string[] {
  return parts.map((p) => decodeURIComponent(p.trim())).filter(Boolean);
}

/** Résout kind= / type= sur esamba://operations/:id?… */
function parseOperationsKindQuery(
  searchParams: URLSearchParams,
): "mission" | "intervention" | null {
  const raw = (searchParams.get("kind") ?? searchParams.get("type") ?? "").toLowerCase().trim();
  if (!raw) return null;
  if (raw === "mission") return "mission";
  if (raw === "intervention" || raw === "ticket") return "intervention";
  return null;
}

/**
 * Détecte le type d’entité opérations lorsque le segment unique utilise un préfixe explicite
 * (recommandé pour les notifications : un UUID seul est ambigu entre mission et ticket).
 */
function parseOperationsTypedSegment(segment: string): ParsedDeepLink | null {
  const sep = segment.indexOf(":");
  if (sep <= 0) return null;
  const kind = segment.slice(0, sep).toLowerCase();
  const id = segment.slice(sep + 1).trim();
  if (!id) return null;

  if (kind === "mission") {
    return { ok: true, kind: "mission", missionId: id };
  }
  if (kind === "intervention" || kind === "ticket") {
    return { ok: true, kind: "intervention", ticketId: id };
  }
  return null;
}

/**
 * Parse une URL de deep link Flotte E-Samba.
 * Formats supportés :
 * - esamba://alerts (liste des alertes)
 * - esamba://fleet (liste des véhicules)
 * - esamba://alerts/:id
 * - esamba://fleet/:id  (fiche véhicule)
 * - esamba://operations/mission/:id
 * - esamba://operations/intervention/:id
 * - esamba://operations/mission:id (équivalent à un seul segment après operations)
 * - esamba://operations/intervention:id | ticket:id
 * - esamba://operations/:id?kind=mission|intervention (ou type=…)
 */
export function parseDeepLink(rawUrl: string): ParsedDeepLink {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, reason: "URL vide" };
  }

  let pathPart = trimmed;
  let searchParams = new URLSearchParams();

  try {
    const u = new URL(trimmed);
    if (u.protocol !== `${ESAMBA_DEEP_LINK_SCHEME}:`) {
      return {
        ok: false,
        reason: `Schéma non supporté (attendu ${ESAMBA_DEEP_LINK_SCHEME}:)`,
      };
    }
    const host = u.hostname || "";
    const pathname = u.pathname.replace(/^\//, "");
    pathPart = [host, pathname].filter(Boolean).join("/");
    searchParams = u.searchParams;
  } catch {
    if (trimmed.startsWith(ESAMBA_DEEP_LINK_PREFIX)) {
      const withoutScheme = trimmed.slice(ESAMBA_DEEP_LINK_PREFIX.length);
      const qIndex = withoutScheme.indexOf("?");
      if (qIndex >= 0) {
        pathPart = withoutScheme.slice(0, qIndex);
        searchParams = new URLSearchParams(withoutScheme.slice(qIndex + 1));
      } else {
        pathPart = withoutScheme;
      }
    } else {
      return { ok: false, reason: "URL invalide" };
    }
  }

  const segments = trimSegments(pathPart.split("/"));

  if (segments.length === 0) {
    return { ok: false, reason: "Chemin vide" };
  }

  if (segments.length === 1) {
    const only = segments[0]!.toLowerCase();
    if (only === "alerts") {
      return { ok: true, kind: "alerts_list" };
    }
    if (only === "fleet") {
      return { ok: true, kind: "fleet_list" };
    }
    return {
      ok: false,
      reason: `Segment unique non reconnu : ${only} (attendu alerts ou fleet pour les listes)`,
    };
  }

  const [domain, a, b] = segments;

  switch (domain) {
    case "alerts": {
      const alertId = a;
      if (!alertId || segments.length > 2) {
        return { ok: false, reason: "Format alerts attendu : esamba://alerts/:id" };
      }
      return { ok: true, kind: "alert", alertId };
    }
    case "fleet": {
      const vehicleId = a;
      if (!vehicleId || segments.length > 2) {
        return { ok: false, reason: "Format fleet attendu : esamba://fleet/:id" };
      }
      return { ok: true, kind: "vehicle", vehicleId };
    }
    case "operations": {
      if (segments.length === 2) {
        const typed = parseOperationsTypedSegment(a);
        if (typed) return typed;
        const fromQuery = parseOperationsKindQuery(searchParams);
        if (fromQuery === "mission") {
          return { ok: true, kind: "mission", missionId: a };
        }
        if (fromQuery === "intervention") {
          return { ok: true, kind: "intervention", ticketId: a };
        }
        return {
          ok: false,
          reason:
            "Pour esamba://operations/:id, ajoutez ?kind=mission|intervention (ou type=…), ou utilisez mission:id, intervention:id, ou operations/mission/:id",
        };
      }
      if (segments.length === 3) {
        const sub = a.toLowerCase();
        const id = b;
        if (sub === "mission") {
          return { ok: true, kind: "mission", missionId: id };
        }
        if (sub === "intervention" || sub === "ticket") {
          return { ok: true, kind: "intervention", ticketId: id };
        }
        return { ok: false, reason: "Sous-chemin opérations inconnu (mission | intervention)" };
      }
      return { ok: false, reason: "Chemin operations trop long" };
    }
    default:
      return { ok: false, reason: `Domaine inconnu : ${domain}` };
  }
}

/** Cible pour générer une URL esamba:// (payload push, tests). */
export type EsambaDeepLinkBuildTarget =
  | { screen: "alerts_list" }
  | { screen: "fleet_list" }
  | { screen: "alert"; id: string }
  | { screen: "vehicle"; id: string }
  | { screen: "mission"; id: string }
  | { screen: "intervention"; id: string };

/**
 * Construit une URL deep link sans ambiguïté (formes préférées pour FCM/APNs).
 */
export function buildEsambaDeepLinkUrl(target: EsambaDeepLinkBuildTarget): string {
  const enc = encodeURIComponent;
  switch (target.screen) {
    case "alerts_list":
      return `${ESAMBA_DEEP_LINK_PREFIX}alerts`;
    case "fleet_list":
      return `${ESAMBA_DEEP_LINK_PREFIX}fleet`;
    case "alert":
      return `${ESAMBA_DEEP_LINK_PREFIX}alerts/${enc(target.id)}`;
    case "vehicle":
      return `${ESAMBA_DEEP_LINK_PREFIX}fleet/${enc(target.id)}`;
    case "mission":
      return `${ESAMBA_DEEP_LINK_PREFIX}operations/mission/${enc(target.id)}`;
    case "intervention":
      return `${ESAMBA_DEEP_LINK_PREFIX}operations/intervention/${enc(target.id)}`;
  }
}

/**
 * Forme compacte esamba://operations/:id?kind=… (équivalente aux routes SPA).
 */
export function buildEsambaOperationsDeepLink(
  id: string,
  kind: "mission" | "intervention",
): string {
  const q = kind === "mission" ? "kind=mission" : "kind=intervention";
  return `${ESAMBA_DEEP_LINK_PREFIX}operations/${encodeURIComponent(id)}?${q}`;
}
