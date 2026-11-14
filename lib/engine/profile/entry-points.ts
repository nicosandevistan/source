import type { EntryType } from "./types";

/**
 * Entry-point prompts (spec 7.1): things that rarely appear on LinkedIn
 * but make the rarest hooks.
 */
export const ENTRY_POINT_PROMPTS: { type: EntryType; question: string; placeholder: string }[] = [
  { type: "high_school", question: "Where did you go to high school?", placeholder: "Revere High School" },
  {
    type: "program",
    question: "Any pre-college, summer, pipeline or diversity programs?",
    placeholder: "MIT ESP",
  },
  { type: "scholarship", question: "Any scholarships or fellowships?", placeholder: "Name of the scholarship" },
  { type: "hometown", question: "Where did you grow up?", placeholder: "Revere, MA" },
  { type: "club", question: "Clubs, teams or research labs?", placeholder: "Undergraduate consulting group" },
  {
    type: "affinity_org",
    question: "Affinity organizations you belong to?",
    placeholder: "ALPFA, SHPE, NSBE, oSTEM…",
  },
  { type: "language", question: "Languages you speak?", placeholder: "Spanish" },
  { type: "volunteer", question: "Volunteering?", placeholder: "Organization name" },
  { type: "interest", question: "Causes or interests you care about?", placeholder: "Health equity" },
];
