/**
 * Every tunable number in Common Thread lives here (spec section 14).
 * Nothing in app/, lib/ or jobs/ may hard-code one of these values.
 */

export const limits = {
  /** First-touch emails per user per day. */
  DAILY_SEND_CAP: 8,
  DAILY_SEND_CAP_MIN: 1,
  DAILY_SEND_CAP_MAX: 15,
  /** Minimum gap between sends. */
  SEND_SPACING_MINUTES: 4,
  /** Local hours (24h clock) between which sends may go out, weekdays only. */
  SEND_WINDOW_START_HOUR: 8,
  SEND_WINDOW_END_HOUR: 18,
  /** A recipient who got a first touch from any user is locked for this long. */
  RECIPIENT_COOLDOWN_DAYS: 14,
  /** Rolling window for the fatigue limit and the club recipient log. */
  RECIPIENT_FATIGUE_WINDOW_DAYS: 60,
  MAX_FIRST_TOUCH_PER_RECIPIENT_60D: 2,
  MAX_FIRST_TOUCH_PER_RECIPIENT_60D_CLUB: 1,
  FOLLOWUP_BUSINESS_DAYS: 7,
  MAX_FOLLOWUPS: 1,
  /** Hour (user's time zone) the daily digest goes out. */
  DIGEST_HOUR: 8,
  THANK_YOU_DUE_HOURS: 24,
  /** Referral ask unlocks when the application window starts within this many days. */
  REFERRAL_WINDOW_DAYS: 30,
} as const;

export const discovery = {
  CANDIDATES_PER_FIRM: 50,
  DEEP_DIVE_PER_FIRM: 15,
  MAX_QUERIES_PER_PERSON: 6,
  /** "Junior" means a start date within this many years. */
  JUNIOR_MAX_YEARS: 3,
  /** The person's name must appear within this many characters of a quote. */
  NAME_PROXIMITY_CHARS: 300,
  PEOPLE_TTL_DAYS: 30,
  EVIDENCE_TTL_DAYS: 30,
  /** Page fetcher: requests per second per domain. */
  FETCH_RATE_PER_DOMAIN_PER_SECOND: 1,
} as const;

export const plan = {
  MIN_TARGET_FIRMS: 5,
  MAX_TARGET_FIRMS: 8,
  FIRST_ASK_MINUTES_MIN: 15,
  FIRST_ASK_MINUTES_MAX: 20,
} as const;

export const drafting = {
  DRAFT_MAX_WORDS: 110,
  FOLLOWUP_MAX_WORDS: 60,
  SUBJECT_MAX_WORDS: 8,
  VARIANTS_PER_PERSON: 2,
  MAX_REGENERATIONS: 1,
  BANNED_PHRASES: [
    "I hope this email finds you well",
    "pick your brain",
    "I came across your profile",
  ],
} as const;

export const budget = {
  /** Zero-cost build (see DECISIONS.md, "Zero-cost build"): no paid calls, so the budget is 0. */
  MONTHLY_BUDGET_USD_PER_USER: 0,
} as const;

/** Hook weights and default group sizes (spec section 7.7). */
export const hookTypes = {
  direct_contact: { weight: 1.0, defaultGroupSize: 10 },
  small_program: { weight: 0.8, defaultGroupSize: 200 },
  employer: { weight: 0.7, defaultGroupSize: 5_000 },
  high_school: { weight: 0.7, defaultGroupSize: 2_000 },
  affinity_org: { weight: 0.6, defaultGroupSize: 5_000 },
  hometown: { weight: 0.5, defaultGroupSize: 50_000 },
  college: { weight: 0.4, defaultGroupSize: 30_000 },
  language: { weight: 0.2, defaultGroupSize: 1_000_000 },
  interest: { weight: 0.2, defaultGroupSize: 1_000_000 },
} as const;

export type HookType = keyof typeof hookTypes;

export const scoring = {
  /** Added to the college weight when club or major also matches. */
  COLLEGE_SAME_CLUB_OR_MAJOR_BONUS: 0.2,
  /** Rarity r(N) = min(RARITY_MAX, max(RARITY_FLOOR, 1 - log10(N) / RARITY_LOG_DIVISOR)). */
  RARITY_FLOOR: 0.2,
  RARITY_MAX: 1,
  RARITY_LOG_DIVISOR: 5,
  /** Overlap factor when both people were there at the same time. */
  TIME_OVERLAP_FACTOR: 1.2,
  NO_TIME_OVERLAP_FACTOR: 1.0,
  ADJUST_JUNIOR: 0.1,
  ADJUST_ALUM: 0.05,
  ADJUST_MENTOR: 0.1,
  ADJUST_BUSY: 0.2,
  /** "Busy" = this many app users contacted the person within BUSY_WINDOW_DAYS. */
  BUSY_CONTACT_COUNT: 3,
  BUSY_WINDOW_DAYS: 60,
} as const;

/** Profile builder (milestone 1). */
export const profile = {
  /** Largest PDF the import endpoint accepts. */
  MAX_UPLOAD_BYTES: 4_000_000,
  /** Largest total size of export CSV text the browser may send. */
  MAX_EXPORT_CHARS: 2_000_000,
  MAX_ENTRIES_PER_IMPORT: 200,
  MAX_VOICE_SAMPLES: 2,
  VOICE_SAMPLE_MIN_CHARS: 40,
  VOICE_SAMPLE_MAX_CHARS: 4_000,
  MAX_ALIASES: 12,
} as const;

/**
 * Which hook type supplies the default group size for each kind of
 * profile entry (the user can override the number per entry).
 */
export const entryTypeToHookType = {
  employer: "employer",
  school: "college",
  program: "small_program",
  scholarship: "small_program",
  club: "small_program",
  affinity_org: "affinity_org",
  hometown: "hometown",
  high_school: "high_school",
  language: "language",
  interest: "interest",
  volunteer: "affinity_org",
  publication: "small_program",
  other: "employer",
} as const satisfies Record<string, HookType>;

export const featureFlags = {
  /** Milestone 8. Stays off until the owner decides (spec section 10). */
  CHROME_EXTENSION: false,
} as const;

/**
 * Google OAuth scopes (hard rule 8). Sign-in uses the basic set only;
 * gmail.send is requested later through incremental consent (milestone 4).
 */
export const googleScopes = {
  SIGN_IN: ["openid", "email", "profile"],
  SEND: "https://www.googleapis.com/auth/gmail.send",
} as const;

export const appConfig = {
  limits,
  discovery,
  plan,
  drafting,
  budget,
  hookTypes,
  scoring,
  profile,
  entryTypeToHookType,
  featureFlags,
  googleScopes,
} as const;
