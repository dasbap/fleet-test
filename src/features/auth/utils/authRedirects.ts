import { ESAMBA_DEEP_LINK_PREFIX } from "@/lib/deepLinks/deepLinkConfig";
import { isNativePlatform } from "@/lib/platform";

const DEFAULT_PUBLIC_APP_URL = "https://www.e-samba.com";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function isLocalBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  } catch {
    return false;
  }
}

function resolveWebBaseUrl(): string {
  const configured = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

  if (configured) {
    const normalizedConfigured = normalizeBaseUrl(configured);
    if (!import.meta.env.PROD || !isLocalBaseUrl(normalizedConfigured)) {
      return normalizedConfigured;
    }
  }

  if (currentOrigin) {
    const normalizedOrigin = normalizeBaseUrl(currentOrigin);
    if (!import.meta.env.PROD || !isLocalBaseUrl(normalizedOrigin)) {
      return normalizedOrigin;
    }
  }

  return DEFAULT_PUBLIC_APP_URL;
}

export function getAuthRedirectUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

  if (isNativePlatform()) {
    const usePublicWebRedirects =
      (import.meta.env.VITE_AUTH_MOBILE_USE_WEB_REDIRECTS as string | undefined) === "true";
    if (!usePublicWebRedirects) {
      return `${ESAMBA_DEEP_LINK_PREFIX}${normalizedPath}`;
    }
  }

  const base = resolveWebBaseUrl();
  const spaPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${spaPath}`;
}
