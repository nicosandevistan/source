export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Path prefixes that need a signed-in user. */
const PROTECTED_PREFIXES = [DASHBOARD_PATH];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Only allow redirects to paths inside this app, so a crafted link
 * cannot bounce a user to another site after sign-in.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DASHBOARD_PATH;
  }
  return next;
}
