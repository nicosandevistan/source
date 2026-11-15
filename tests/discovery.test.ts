import { describe, expect, it } from "vitest";
import { candidatesFor, searchQueries, type Person, type StoredEvidence } from "@/lib/engine/discovery/candidates";
import { parseConnections } from "@/lib/engine/discovery/connections";
import { classifyTitle } from "@/lib/engine/discovery/titles";
import { htmlToText } from "@/lib/engine/evidence/html";
import { robotsAllows } from "@/lib/engine/evidence/robots";
import { findHooks, sentences, type HookEntry } from "@/lib/engine/hooks/find";
import { nameMentions } from "@/lib/engine/hooks/names";
import { hookStrength, personScore, rarity } from "@/lib/engine/hooks/score";
import { isSensitive } from "@/lib/engine/hooks/sensitive";
import { verifyHook } from "@/lib/engine/hooks/verify";
import { firmBySlug } from "@/lib/engine/plan/timeline";
import { normalizeForMatch } from "@/lib/engine/profile/text";
import { checkUrl, isPrivateAddress } from "@/lib/policy/sources";

// All names below are made up.
const ESP: HookEntry = {
  id: "e-esp",
  type: "program",
  value: "MIT ESP",
  aliases: ["MIT Educational Studies Program", "Splash"],
  start_date: "2022",
  end_date: "2022",
  est_group_size: 200,
  use_for_matching: true,
};
const SCHOOL: HookEntry = {
  id: "e-school",
  type: "school",
  value: "Example State University",
  aliases: [],
  start_date: "2024",
  end_date: "2028",
  est_group_size: 30_000,
  use_for_matching: true,
};
const NORTHWIND: HookEntry = {
  id: "e-north",
  type: "employer",
  value: "Northwind Biotech",
  aliases: [],
  start_date: "2026-06",
  end_date: "2026-08",
  est_group_size: 5_000,
  use_for_matching: true,
};
const ENTRIES = [ESP, SCHOOL, NORTHWIND];

const PERSON = { fullName: "Dana Okafor", company: "Boston Consulting Group" };

const PAGE = [
  "Our team | Boston Consulting Group",
  "Dana Okafor is a consultant in our Boston office. Before BCG, Dana Okafor taught chemistry classes for the MIT Educational Studies Program in 2022.",
  "She studied economics at Example State University.",
].join("\n");

describe("connections import", () => {
  const csv = [
    "Notes:",
    '"When exporting your connection data, you may notice that some of the email addresses are missing."',
    "",
    "First Name,Last Name,URL,Email Address,Company,Position,Connected On",
    "Dana,Okafor,https://www.linkedin.com/in/dana-example,dana@example.com,Boston Consulting Group,Consultant,02 Nov 2025",
    "Sam,Lee,https://evil.example.com/in/sam,,Bain & Company,Senior Manager,11/02/2024",
    ",,,,,,",
  ].join("\n");

  it("reads names, company, title and date, and drops email addresses", () => {
    const people = parseConnections(csv);
    expect(people).toEqual([
      {
        fullName: "Dana Okafor",
        company: "Boston Consulting Group",
        title: "Consultant",
        linkedinUrl: "https://www.linkedin.com/in/dana-example",
        connectedOn: "2025-11",
      },
      { fullName: "Sam Lee", company: "Bain & Company", title: "Senior Manager", linkedinUrl: null, connectedOn: "2024-11" },
    ]);
    expect(JSON.stringify(people)).not.toContain("@");
  });
});

describe("titles", () => {
  it("tells junior, senior and recruiter titles apart", () => {
    expect(classifyTitle("Associate")).toEqual({ junior: true, recruiter: false });
    expect(classifyTitle("Business Analyst")).toEqual({ junior: true, recruiter: false });
    expect(classifyTitle("Senior Associate")).toEqual({ junior: false, recruiter: false });
    expect(classifyTitle("Associate Director, Strategy")).toEqual({ junior: false, recruiter: false });
    expect(classifyTitle("Partner & Managing Director")).toEqual({ junior: false, recruiter: false });
    expect(classifyTitle("Campus Recruiter")).toEqual({ junior: false, recruiter: true });
    expect(classifyTitle("Talent Acquisition Partner")).toEqual({ junior: false, recruiter: true });
  });
});

describe("name matching", () => {
  it("finds a full name, a middle name, and last name with first initial", () => {
    const norm = (s: string) => normalizeForMatch(s);
    expect(nameMentions(norm("Dana Okafor joined"), "Dana Okafor")).toHaveLength(1);
    expect(nameMentions(norm("Dana M. Okafor joined"), "Dana Okafor")).toHaveLength(1);
    expect(nameMentions(norm("Okafor, D. (2022)"), "Dana Okafor")).toHaveLength(1);
    expect(nameMentions(norm("D. Okafor taught"), "Dana Okafor")).toHaveLength(1);
    expect(nameMentions(norm("Maria Okafor taught"), "Dana Okafor")).toHaveLength(0);
  });
});

describe("hook finding", () => {
  const hooks = findHooks(PERSON, { id: "ev1", text: PAGE, url: "https://example.com/team" }, ENTRIES, ["BCG"]);

  it("finds the MIT ESP hook through its alternate name, with the sentence as the quote", () => {
    const esp = hooks.find((h) => h.entryId === "e-esp")!;
    expect(esp).toMatchObject({
      matched: "MIT Educational Studies Program",
      hookType: "small_program",
      identityConfirmed: true,
      timeOverlap: true,
    });
    expect(esp.quote).toBe(
      "Before BCG, Dana Okafor taught chemistry classes for the MIT Educational Studies Program in 2022.",
    );
  });

  it("finds a school within reach of the name, and skips entries the page doesn't mention", () => {
    expect(hooks.map((h) => h.entryId).sort()).toEqual(["e-esp", "e-school"]);
  });

  it("ignores entries switched off for matching", () => {
    const off = findHooks(PERSON, { id: "ev1", text: PAGE, url: null }, [{ ...ESP, use_for_matching: false }]);
    expect(off).toEqual([]);
  });

  it("finds nothing when the person isn't on the page", () => {
    const other = findHooks({ fullName: "Riley Park", company: "BCG" }, { id: "ev", text: PAGE, url: null }, ENTRIES);
    expect(other).toEqual([]);
  });
});

describe("sentence splitting", () => {
  const split = (t: string) => sentences(t).map((s) => t.slice(s.start, s.end));
  it("keeps abbreviations and initials inside a sentence", () => {
    expect(split("Dana is at L.E.K. Consulting in Boston. Before L.E.K., Dana taught for Splash. Dr. Lee agreed.")).toEqual([
      "Dana is at L.E.K. Consulting in Boston.",
      "Before L.E.K., Dana taught for Splash.",
      "Dr. Lee agreed.",
    ]);
    expect(split("J. P. Morgan hired 40 analysts in 2024! Wow.\nNext line")).toEqual([
      "J. P. Morgan hired 40 analysts in 2024!",
      "Wow.",
      "Next line",
    ]);
  });
});

describe("verifier (spec 13: must reject these)", () => {
  const good = { quote: "Before BCG, Dana Okafor taught chemistry classes for the MIT Educational Studies Program in 2022.", matched: "MIT Educational Studies Program" };

  it("accepts a real quote, ignoring case and spacing", () => {
    expect(verifyHook(good, PAGE, PERSON, ["BCG"])).toEqual({ verified: true, identityConfirmed: true });
    const spaced = { ...good, quote: "  before bcg,   DANA okafor taught chemistry classes for the MIT educational studies program in 2022 " };
    expect(verifyHook(spaced, PAGE, PERSON, ["BCG"]).verified).toBe(true);
  });

  it("rejects a paraphrased quote", () => {
    const paraphrase = { ...good, quote: "Dana Okafor used to teach chemistry at the MIT Educational Studies Program." };
    expect(verifyHook(paraphrase, PAGE, PERSON)).toMatchObject({ verified: false, reason: "quote not found in source" });
  });

  it("rejects a real quote about a different person with the same last name", () => {
    const page = "Maria Okafor taught classes for the MIT Educational Studies Program in 2022. She works at Boston Consulting Group.";
    const quote = { quote: "Maria Okafor taught classes for the MIT Educational Studies Program in 2022.", matched: "MIT Educational Studies Program" };
    expect(verifyHook(quote, page, PERSON)).toMatchObject({ verified: false, reason: "person not named near the quote" });
  });

  it("rejects a quote whose name mention is more than 300 characters away", () => {
    const filler = " Lorem ipsum dolor sit amet.".repeat(20);
    const page = `Dana Okafor works at Boston Consulting Group.${filler} A volunteer taught for the MIT Educational Studies Program.`;
    const quote = { quote: "A volunteer taught for the MIT Educational Studies Program.", matched: "MIT Educational Studies Program" };
    expect(verifyHook(quote, page, PERSON)).toMatchObject({ verified: false, reason: "person not named near the quote" });
  });

  it("marks identity unconfirmed when the page never names their company", () => {
    const page = "Dana Okafor taught classes for the MIT Educational Studies Program in 2022.";
    const quote = { quote: page, matched: "MIT Educational Studies Program" };
    expect(verifyHook(quote, page, PERSON)).toEqual({ verified: true, identityConfirmed: false });
  });

  it("rejects a quote that doesn't contain the overlap it claims", () => {
    const wrong = { ...good, matched: "Splash" };
    expect(verifyHook(wrong, PAGE, PERSON)).toMatchObject({ verified: false });
  });

  it("rejects quotes with personal details", () => {
    const page = "Dana Okafor, who lives at 12 Elm Street, volunteers with Splash. Boston Consulting Group.";
    const quote = { quote: "Dana Okafor, who lives at 12 Elm Street, volunteers with Splash.", matched: "Splash" };
    expect(verifyHook(quote, page, PERSON)).toMatchObject({ verified: false, reason: "personal detail" });
  });
});

describe("sensitive filter", () => {
  it("catches phone numbers, addresses and personal-life details, not ordinary work text", () => {
    expect(isSensitive("Call (555) 555-0100 to reach Dana.")).toBe(true);
    expect(isSensitive("She lives at 450 Main St. in Cambridge.")).toBe(true);
    expect(isSensitive("Dana and her husband volunteer at church.")).toBe(true);
    expect(isSensitive("Dana led the oncology strategy team in 2024.")).toBe(false);
    expect(isSensitive("Dana taught for Splash in 2022 with 40 students.")).toBe(false);
  });
});

describe("scoring (spec 7.7)", () => {
  it("rarity hits the spec's reference points", () => {
    expect(rarity(30_000)).toBeCloseTo(0.2, 2);
    expect(rarity(40)).toBeCloseTo(0.68, 2);
    expect(rarity(1)).toBe(1);
    expect(rarity(10_000_000)).toBe(0.2);
  });

  it("strength is weight × rarity × overlap", () => {
    expect(hookStrength("small_program", 200, false)).toBeCloseTo(0.8 * (1 - Math.log10(200) / 5), 6);
    expect(hookStrength("small_program", 200, true)).toBeCloseTo(0.8 * (1 - Math.log10(200) / 5) * 1.2, 6);
  });

  it("combines hooks with diminishing returns, adds adjustments and clamps", () => {
    const s = personScore({ strengths: [0.5, 0.5], junior: true, alum: true, mentor: false, busy: false });
    expect(s.hooks).toBeCloseTo(0.75, 6);
    expect(s.total).toBeCloseTo(0.9, 6);
    expect(personScore({ strengths: [0.95, 0.9], junior: true, alum: true, mentor: true, busy: false }).total).toBe(1);
    expect(personScore({ strengths: [], junior: false, alum: false, mentor: false, busy: true }).total).toBe(0);
  });
});

describe("candidates and ladder", () => {
  const bcg = firmBySlug("bcg")!;
  const people: Person[] = [
    { id: "p1", source: "connections", full_name: "Dana Okafor", company: "BCG", title: "Associate", linkedin_url: null },
    { id: "p2", source: "connections", full_name: "Sam Lee", company: "Boston Consulting Group", title: "Principal", linkedin_url: null },
    { id: "p3", source: "connections", full_name: "Ari Cohen", company: "The Boston Consulting Group", title: "University Recruiter", linkedin_url: null },
    { id: "p4", source: "manual", full_name: "Lee Park", company: "Bain & Company", title: "Associate", linkedin_url: null },
  ];
  const evidence: StoredEvidence[] = [
    { id: "ev1", personId: "p1", kind: "web", url: "https://example.com/team", text: PAGE },
    {
      id: "ev2",
      personId: "p2",
      kind: "pasted",
      url: null,
      text: "Sam Lee, Principal at Boston Consulting Group. Sam Lee graduated from Example State University in 2010.",
    },
  ];
  const list = candidatesFor(bcg, null, people, evidence, ENTRIES);

  it("finds everyone at the firm under any of its names, and no one else", () => {
    expect(list.map((c) => c.person.id).sort()).toEqual(["p1", "p2", "p3"]);
  });

  it("ranks by score and shows only verified, identity-confirmed hooks", () => {
    expect(list[0].person.id).toBe("p1");
    expect(list[0].hooks.map((h) => h.entryId)).toContain("e-esp");
    for (const c of list) for (const h of c.hooks) expect(h.identityConfirmed).toBe(true);
    expect(list[0].score.total).toBeGreaterThan(list[1].score.total);
  });

  it("assigns the ladder: warm junior, a different hook type, then the recruiter", () => {
    const rung = (id: string) => list.find((c) => c.person.id === id)!.rung;
    expect(rung("p1")).toBe("warm_junior");
    // p1 has small_program and college hooks; p2 only college, so no second rung.
    expect(rung("p2")).toBeNull();
    expect(rung("p3")).toBe("recruiter");
  });

  it("adds a same-employer overlap from the record when the user worked at the firm", () => {
    const takeda = firmBySlug("takeda")!;
    const worked: HookEntry = { ...NORTHWIND, id: "e-takeda", value: "Takeda Pharmaceutical Company" };
    const c = candidatesFor(
      takeda,
      null,
      [{ id: "t1", source: "connections", full_name: "Kim Ito", company: "Takeda", title: "Analyst", linkedin_url: "https://www.linkedin.com/in/kim" }],
      [],
      [worked],
    );
    expect(c[0].hooks).toEqual([
      expect.objectContaining({ entryId: "e-takeda", hookType: "employer", source: "record", quote: "Analyst at Takeda" }),
    ]);
    expect(c[0].rung).toBe("warm_junior");
  });

  it("builds at most 6 search links: name with company, then rarest entries", () => {
    const q = searchQueries(people[0], ENTRIES);
    expect(q[0]).toBe('"Dana Okafor" "BCG"');
    expect(q[1]).toBe('"Dana Okafor" "MIT Educational Studies Program"');
    expect(q.length).toBeLessThanOrEqual(6);
  });
});

describe("source policy", () => {
  it("never fetches LinkedIn, social media or people-search sites", () => {
    expect(checkUrl("https://www.linkedin.com/in/someone")).toMatchObject({ allowed: false });
    expect(checkUrl("https://facebook.com/x")).toMatchObject({ allowed: false });
    expect(checkUrl("https://www.spokeo.com/x")).toMatchObject({ allowed: false });
    expect(checkUrl("https://bcg.com.evil.com/team")).toMatchObject({ allowed: true });
    expect(checkUrl("https://www.bcg.com/about/people")).toEqual({ allowed: true, host: "www.bcg.com" });
  });

  it("refuses non-web and private addresses", () => {
    expect(checkUrl("file:///etc/passwd")).toMatchObject({ allowed: false });
    expect(checkUrl("http://localhost:3000")).toMatchObject({ allowed: false });
    expect(checkUrl("https://user:pw@example.com")).toMatchObject({ allowed: false });
    for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.10", "172.20.1.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("reads robots.txt rules for our agent or everyone", () => {
    const robots = "User-agent: *\nDisallow: /private/\nAllow: /private/team\n\nUser-agent: BadBot\nDisallow: /";
    expect(robotsAllows(robots, "/about", "CommonThreadBot")).toBe(true);
    expect(robotsAllows(robots, "/private/x", "CommonThreadBot")).toBe(false);
    expect(robotsAllows(robots, "/private/team", "CommonThreadBot")).toBe(true);
    expect(robotsAllows("User-agent: CommonThreadBot\nDisallow: /", "/team", "CommonThreadBot")).toBe(false);
    expect(robotsAllows("", "/anything", "CommonThreadBot")).toBe(true);
  });
});

describe("page text", () => {
  it("keeps visible words in order and drops scripts and markup", () => {
    const html = `<html><head><title>x</title><script>var a = "Dana";</script></head>
      <body><h1>Our team</h1><p>Dana&nbsp;Okafor &amp; friends</p><div>Taught for <b>Splash</b> &#8212; 2022</div></body></html>`;
    expect(htmlToText(html)).toBe("Our team\nDana Okafor & friends\nTaught for Splash — 2022");
  });
});
