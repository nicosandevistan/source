import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const SKIP = new Set(["node_modules", ".next", ".git", "coverage", ".vercel"]);

/** Every file under the given top-level paths, relative to the repo root. */
export function listFiles(...tops: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (SKIP.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(ROOT, full));
    }
  };
  for (const top of tops) {
    const full = join(ROOT, top);
    try {
      if (statSync(full).isDirectory()) walk(full);
      else out.push(top);
    } catch {
      // Path does not exist yet (for example extension/ before milestone 8).
    }
  }
  return out;
}

export function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}
