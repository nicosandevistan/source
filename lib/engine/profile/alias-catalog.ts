/**
 * Known alternate names, kept by hand. Each group lists names that mean the
 * same thing; "related" holds sub-programs or chapters that belong to it.
 * Suggestions from here are only proposals: the user confirms each one.
 *
 * To add a group, put every common spelling in `names` (official name,
 * short name, acronym). Keep it to real, public names.
 */
export type AliasGroup = { names: string[]; related?: string[] };

export const ALIAS_CATALOG: AliasGroup[] = [
  // Pre-college and pipeline programs
  {
    names: ["MIT ESP", "MIT Educational Studies Program", "Educational Studies Program", "ESP at MIT"],
    related: ["Splash", "Spark", "HSSP", "High School Studies Program", "Cascade", "Junction"],
  },
  { names: ["Upward Bound", "Upward Bound Program"], related: ["TRIO", "Upward Bound Math-Science"] },
  { names: ["TRIO", "Federal TRIO Programs"], related: ["Upward Bound", "Talent Search", "Student Support Services"] },
  { names: ["QuestBridge", "QuestBridge Scholars", "QuestBridge National College Match"] },
  { names: ["Posse Foundation", "Posse Scholar", "The Posse Foundation"] },
  { names: ["SEO", "Sponsors for Educational Opportunity", "SEO Scholars", "SEO Career"] },
  { names: ["MLT", "Management Leadership for Tomorrow"], related: ["MLT Career Prep", "MLT Rising Leaders"] },
  { names: ["Jack Kent Cooke Foundation", "Cooke Scholar", "Jack Kent Cooke Scholarship"] },
  { names: ["Gates Scholarship", "The Gates Scholarship"] },
  { names: ["Hispanic Scholarship Fund", "HSF", "HSF Scholar"] },
  { names: ["National Honor Society", "NHS"] },
  { names: ["Boys & Girls Club", "Boys and Girls Club", "Boys & Girls Clubs of America", "BGCA"] },
  { names: ["Christian A. Herter Memorial Scholarship", "Herter Scholarship", "Herter Memorial Scholarship"] },
  { names: ["Summer Search"] },
  { names: ["College Possible"] },
  { names: ["Breakthrough Collaborative", "Breakthrough"] },

  // Affinity and professional organizations (spec 7.6)
  { names: ["ALPFA", "Association of Latino Professionals For America"] },
  { names: ["Prospanica", "National Society of Hispanic MBAs", "NSHMBA"] },
  { names: ["SHPE", "Society of Hispanic Professional Engineers"] },
  { names: ["NSBE", "National Society of Black Engineers"] },
  { names: ["oSTEM", "Out in Science, Technology, Engineering, and Mathematics"] },
  { names: ["SACNAS", "Society for Advancement of Chicanos/Hispanics and Native Americans in Science"] },
  { names: ["SWE", "Society of Women Engineers"] },
  { names: ["NABA", "National Association of Black Accountants"] },
  { names: ["Out for Undergrad", "O4U"] },
  { names: ["Phi Beta Kappa", "PBK"] },
  { names: ["Beta Gamma Sigma", "BGS"] },
  { names: ["iGEM", "International Genetically Engineered Machine", "iGEM Competition"] },
  { names: ["DECA"] },
  { names: ["FBLA", "Future Business Leaders of America"] },
  { names: ["Model UN", "Model United Nations", "MUN"] },

  // Schools (common short forms)
  { names: ["MIT", "Massachusetts Institute of Technology"] },
  { names: ["UMass Amherst", "University of Massachusetts Amherst", "UMass", "University of Massachusetts, Amherst"], related: ["Isenberg School of Management", "Commonwealth Honors College"] },
  { names: ["UMass Boston", "University of Massachusetts Boston"] },
  { names: ["UMass Lowell", "University of Massachusetts Lowell"] },
  { names: ["Boston University", "BU"], related: ["Questrom School of Business"] },
  { names: ["Boston College", "BC"], related: ["Carroll School of Management"] },
  { names: ["Northeastern University", "Northeastern", "NEU"], related: ["D'Amore-McKim School of Business"] },
  { names: ["Harvard University", "Harvard", "Harvard College"] },
  { names: ["University of Pennsylvania", "UPenn", "Penn"], related: ["The Wharton School", "Wharton"] },
  { names: ["NYU", "New York University"], related: ["NYU Stern", "Stern School of Business"] },
  { names: ["UC Berkeley", "University of California, Berkeley", "Berkeley", "Cal"], related: ["Haas School of Business"] },
  { names: ["UCLA", "University of California, Los Angeles"] },
  { names: ["USC", "University of Southern California"] },
  { names: ["Georgia Tech", "Georgia Institute of Technology"] },
  { names: ["Caltech", "California Institute of Technology"] },
  { names: ["CMU", "Carnegie Mellon University", "Carnegie Mellon"] },
  { names: ["UChicago", "University of Chicago"], related: ["Booth School of Business"] },
  { names: ["UMich", "University of Michigan", "Michigan"], related: ["Ross School of Business"] },
  { names: ["UT Austin", "University of Texas at Austin"], related: ["McCombs School of Business"] },
  { names: ["UVA", "University of Virginia"], related: ["McIntire School of Commerce"] },
  { names: ["UNC", "University of North Carolina at Chapel Hill", "UNC Chapel Hill"], related: ["Kenan-Flagler Business School"] },
  { names: ["WashU", "Washington University in St. Louis"], related: ["Olin Business School"] },

  // Firms (common short forms)
  { names: ["BCG", "Boston Consulting Group", "The Boston Consulting Group"] },
  { names: ["McKinsey", "McKinsey & Company"] },
  { names: ["Bain", "Bain & Company"] },
  { names: ["ZS", "ZS Associates"] },
  { names: ["L.E.K. Consulting", "LEK Consulting", "L.E.K.", "LEK"] },
  { names: ["J.P. Morgan", "JPMorgan", "JPMorgan Chase", "JPMorgan Chase & Co.", "J.P. Morgan Chase"] },
  { names: ["Goldman Sachs", "Goldman", "GS"] },
  { names: ["Morgan Stanley", "MS"] },
  { names: ["Bank of America", "BofA", "BofA Securities"] },
  { names: ["Takeda", "Takeda Pharmaceuticals", "Takeda Pharmaceutical Company"] },
  { names: ["J&J", "Johnson & Johnson", "Johnson and Johnson"] },
];

/** Words left out when building an acronym from a long name. */
export const ACRONYM_STOPWORDS = new Set(["of", "the", "and", "for", "at", "in", "on", "a", "an", "&", "to"]);
