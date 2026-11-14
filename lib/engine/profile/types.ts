/** Entry types from spec section 6 (profile_entries.type). */
export const ENTRY_TYPES = [
  "employer",
  "school",
  "program",
  "scholarship",
  "club",
  "affinity_org",
  "hometown",
  "high_school",
  "language",
  "interest",
  "volunteer",
  "publication",
  "other",
] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_SOURCES = ["linkedin_pdf", "linkedin_export", "resume", "manual"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  employer: "Employer",
  school: "College or university",
  program: "Program",
  scholarship: "Scholarship",
  club: "Club or team",
  affinity_org: "Affinity organization",
  hometown: "Hometown",
  high_school: "High school",
  language: "Language",
  interest: "Interest or cause",
  volunteer: "Volunteering",
  publication: "Publication",
  other: "Other",
};

/** An entry before it is saved. */
export type DraftEntry = {
  type: EntryType;
  value: string;
  start: string | null;
  end: string | null;
  details: string | null;
  source: EntrySource;
  useForMatching: boolean;
  /** True when the user should look at this entry before trusting it. */
  needsReview: boolean;
};

/** An entry as stored in profile_entries. */
export type ProfileEntry = {
  id: string;
  type: EntryType;
  value: string;
  aliases: string[];
  start_date: string | null;
  end_date: string | null;
  details: string | null;
  est_group_size: number;
  source: EntrySource;
  use_for_matching: boolean;
  needs_review: boolean;
};
