/**
 * Source policy (spec section 11). Professional and public-service pages
 * are allowed; social media, people-search and record sites are not, and
 * linkedin.com is never fetched (hard rule 1).
 */
const BLOCKED_DOMAINS = [
  "linkedin.com",
  "lnkd.in",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "threads.net",
  "snapchat.com",
  "reddit.com",
  "whitepages.com",
  "spokeo.com",
  "beenverified.com",
  "truepeoplesearch.com",
  "fastpeoplesearch.com",
  "peoplefinders.com",
  "intelius.com",
  "mylife.com",
  "radaris.com",
  "zabasearch.com",
  "instantcheckmate.com",
  "truthfinder.com",
  "familytreenow.com",
  "zillow.com",
  "redfin.com",
  "realtor.com",
  "courtlistener.com",
  "judyrecords.com",
  "unicourt.com",
  "pacer.gov",
];

export type PolicyResult = { allowed: true; host: string } | { allowed: false; reason: string };

function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function checkUrl(raw: string): PolicyResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { allowed: false, reason: "That isn't a web address." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { allowed: false, reason: "Only web pages can be added." };
  if (url.username || url.password) return { allowed: false, reason: "Addresses with a login in them can't be used." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_DOMAINS.some((d) => hostMatches(host, d))) {
    return host.includes("linkedin") || host === "lnkd.in"
      ? { allowed: false, reason: "LinkedIn pages are never fetched. Paste what you read there instead." }
      : { allowed: false, reason: "That site isn't allowed: only professional and public pages are used." };
  }
  if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return { allowed: false, reason: "That address isn't a public website." };
  }
  return { allowed: true, host };
}

/** True for addresses on private, loopback or link-local networks (blocks server-side request forgery). */
export function isPrivateAddress(ip: string): boolean {
  const v4 = ip.replace(/^::ffff:/, "");
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(v4);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}
