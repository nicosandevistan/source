import { discovery } from "@/config/app";
import { normalizeForMatch } from "@/lib/engine/profile/text";
import { mentionsIdentity, type HookPerson } from "./find";
import { nameMentions } from "./names";
import { isSensitive } from "./sensitive";

export type Verdict = { verified: boolean; identityConfirmed: boolean; reason?: string };

/**
 * The quote verifier (spec 7.5 step 4). Runs on every hook, from any
 * source, before it is shown:
 *   1. the quote must be an exact substring of the stored text, after
 *      normalizing whitespace and case;
 *   2. the person's full name, or last name plus first initial, must appear
 *      within 300 characters of the quote;
 *   3. identity: the page must also name the person's company, otherwise the
 *      hook is kept but marked unconfirmed and hidden by default.
 * Quotes that hold personal details are rejected (section 11).
 */
export function verifyHook(
  hook: { quote: string; matched: string },
  storedText: string,
  person: HookPerson,
  companyNames: string[] = [],
): Verdict {
  const text = normalizeForMatch(storedText);
  const quote = normalizeForMatch(hook.quote);
  if (!quote) return { verified: false, identityConfirmed: false, reason: "empty quote" };

  const at = ` ${text} `.indexOf(` ${quote} `);
  if (at === -1) return { verified: false, identityConfirmed: false, reason: "quote not found in source" };

  if (!` ${quote} `.includes(` ${normalizeForMatch(hook.matched)} `)) {
    return { verified: false, identityConfirmed: false, reason: "quote does not name the overlap" };
  }

  const end = at + quote.length;
  const near = nameMentions(text, person.fullName).some(
    (p) => p >= at - discovery.NAME_PROXIMITY_CHARS && p <= end + discovery.NAME_PROXIMITY_CHARS,
  );
  if (!near) return { verified: false, identityConfirmed: false, reason: "person not named near the quote" };

  if (isSensitive(hook.quote)) return { verified: false, identityConfirmed: false, reason: "personal detail" };

  return { verified: true, identityConfirmed: mentionsIdentity(text, person, companyNames) };
}
