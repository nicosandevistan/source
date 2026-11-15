import { normalizeForMatch } from "@/lib/engine/profile/text";

/**
 * Reads seniority from a job title. Connections give a current title but no
 * start date, so "junior" (spec 7.3: started within the last 3 years) is
 * judged from the title alone.
 */
const SENIOR = /\b(senior|sr|principal|partner|director|vp|vice president|head|chief|managing|manager|lead|president|founder|cofounder|co founder|owner|executive|md|svp|evp|ceo|cfo|coo|cto|professor|fellow emeritus)\b/;
const JUNIOR = /\b(analyst|associate|consultant|intern|internship|coordinator|specialist|assistant|scientist i|research associate|engineer|developer|trainee|fellow|apprentice|summer|junior|jr|graduate|new grad|rotational|program)\b/;
const RECRUITER = /\b(recruiter|recruiting|recruitment|talent|campus|university relations|early careers|early talent|university recruiting|people partner)\b/;

export type TitleKind = { junior: boolean; recruiter: boolean };

export function classifyTitle(title: string): TitleKind {
  const t = normalizeForMatch(title);
  const recruiter = RECRUITER.test(t);
  // "Senior Associate" and "Associate Director" are not junior.
  const junior = !recruiter && JUNIOR.test(t) && !SENIOR.test(t) && !/\bassociate (director|partner|principal|vice)\b/.test(t);
  return { junior, recruiter };
}
