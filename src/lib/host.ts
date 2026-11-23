export const MAIN_DOMAIN: string = String(process.env.NEXT_PUBLIC_MAIN_DOMAIN || "lvh.me:3000")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .replace(/\/+$/, "");

const ROOT: string = MAIN_DOMAIN.split(":")[0];

export const IS_LOCAL_DOMAIN: boolean = ROOT === "lvh.me" || ROOT === "localhost";

export function getSubdomain(hostname?: string | null): string {
  const h = String(hostname || "").trim().toLowerCase().split(":")[0];
  if (!h) return "";

  for (const root of [ROOT, "localhost"]) {
    if (root && h.endsWith(`.${root}`)) {
      const sub = h.slice(0, -(root.length + 1));
      // Only one level ("abc"), never "www"
      if (!sub || sub === "www" || sub.includes(".")) return "";
      return sub;
    }
  }
  return "";
}

export function isSchoolHost(hostname?: string | null): boolean {
  return getSubdomain(hostname) !== "";
}

function protocolOf(): string {
  if (typeof window !== "undefined" && window.location?.protocol) return window.location.protocol;
  return IS_LOCAL_DOMAIN ? "http:" : "https:";
}

export function mainUrl(path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${protocolOf()}//${MAIN_DOMAIN}${p}`;
}

export function schoolUrl(slug: string, path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${protocolOf()}//${String(slug).toLowerCase()}.${MAIN_DOMAIN}${p}`;
}