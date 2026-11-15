import "server-only";
import { lookup } from "node:dns/promises";
import { discovery, evidence as evidenceConfig } from "@/config/app";
import { checkUrl, isPrivateAddress } from "@/lib/policy/sources";
import { htmlToText } from "./html";
import { robotsAllows } from "./robots";

export const USER_AGENT = "CommonThreadBot/0.1 (+student networking tool; fetches one page a user asks for)";

export type FetchResult = { ok: true; url: string; host: string; text: string } | { ok: false; error: string };

/** Last fetch time per host, for the 1-request-per-second limit. */
const lastFetch = new Map<string, number>();

async function waitTurn(host: string) {
  const gap = 1000 / discovery.FETCH_RATE_PER_DOMAIN_PER_SECOND;
  const since = Date.now() - (lastFetch.get(host) ?? 0);
  if (since < gap) await new Promise((r) => setTimeout(r, gap - since));
  lastFetch.set(host, Date.now());
}

async function publicHost(host: string): Promise<boolean> {
  try {
    const addresses = await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

async function get(url: URL, accept: string): Promise<Response> {
  return fetch(url, {
    redirect: "manual",
    headers: { "user-agent": USER_AGENT, accept },
    signal: AbortSignal.timeout(evidenceConfig.FETCH_TIMEOUT_MS),
  });
}

async function readCapped(response: Response): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > evidenceConfig.MAX_PAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/**
 * Fetches one public page the user asked for, following the source policy:
 * blocked sites refused, private networks refused (checked again after each
 * redirect), robots.txt respected, one request per second per site, size
 * and time limits. Returns the page's visible text.
 */
export async function fetchPage(raw: string): Promise<FetchResult> {
  let target = raw.trim();
  for (let hop = 0; hop <= evidenceConfig.MAX_REDIRECTS; hop += 1) {
    const policy = checkUrl(target);
    if (!policy.allowed) return { ok: false, error: policy.reason };
    const url = new URL(target);
    if (!(await publicHost(policy.host))) return { ok: false, error: "That site couldn't be reached." };

    // robots.txt (a missing or unreadable file allows everything).
    try {
      await waitTurn(policy.host);
      const robots = await get(new URL("/robots.txt", url), "text/plain");
      if (robots.ok) {
        const txt = (await readCapped(robots)) ?? "";
        if (!robotsAllows(txt, url.pathname + url.search, "CommonThreadBot")) {
          return { ok: false, error: "That site asks tools like this one not to read the page. Paste the text instead." };
        }
      }
    } catch {
      // No robots.txt: allowed.
    }

    await waitTurn(policy.host);
    let response: Response;
    try {
      response = await get(url, "text/html,text/plain;q=0.9");
    } catch {
      return { ok: false, error: "That page didn't load in time." };
    }
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) return { ok: false, error: "That page redirects nowhere." };
      target = new URL(next, url).toString();
      continue;
    }
    if (!response.ok) return { ok: false, error: `That page answered with an error (${response.status}).` };
    const type = response.headers.get("content-type") ?? "";
    if (!/text\/(html|plain)|application\/xhtml/.test(type)) {
      return { ok: false, error: "Only web pages can be read (not PDFs or downloads). Paste the text instead." };
    }
    const body = await readCapped(response);
    if (body === null) return { ok: false, error: "That page is too large." };
    const text = (/html/.test(type) ? htmlToText(body) : body).slice(0, evidenceConfig.MAX_TEXT_CHARS);
    if (text.length < 50) return { ok: false, error: "No readable text on that page. Paste the text instead." };
    return { ok: true, url: url.toString(), host: policy.host, text };
  }
  return { ok: false, error: "That page redirects too many times." };
}
