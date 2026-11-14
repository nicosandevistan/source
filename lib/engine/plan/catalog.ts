/**
 * The firm catalog (spec 7.2): every firm a plan can suggest comes from here.
 * Kept by hand in code so it is free, reviewable in pull requests and easy
 * to test. A firm the user types in that is not here is kept as their own
 * pick (see DECISIONS.md, milestone 2).
 *
 * selectivity: 1 = very selective, 2 = selective, 3 = broader access.
 * These are rough, public-reputation judgments used only to spread a plan
 * across reach, target and likely tiers. Application windows are estimates
 * per segment (see WINDOWS) and are always shown as estimates.
 *
 * To add a firm: give it a unique slug, the segment it belongs to, its
 * common short names in `aliases`, and `focus: ["healthcare"]` if most of
 * its work is in healthcare or life sciences.
 */

export const INDUSTRIES = ["consulting", "banking", "investing", "biotech_pharma", "tech"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  consulting: "Consulting",
  banking: "Investment banking",
  investing: "Investing",
  biotech_pharma: "Biotech & pharma",
  tech: "Tech",
};

export const SEGMENTS = {
  mbb: { industry: "consulting", label: "Strategy consulting (MBB)" },
  strategy_consulting: { industry: "consulting", label: "Strategy consulting" },
  big4_consulting: { industry: "consulting", label: "Big Four and large consulting" },
  economic_consulting: { industry: "consulting", label: "Economic consulting" },
  life_sciences_consulting: { industry: "consulting", label: "Life sciences consulting" },
  bulge_bracket: { industry: "banking", label: "Bulge-bracket bank" },
  elite_boutique: { industry: "banking", label: "Elite boutique bank" },
  middle_market_bank: { industry: "banking", label: "Middle-market and healthcare bank" },
  private_equity: { industry: "investing", label: "Private equity" },
  healthcare_investing: { industry: "investing", label: "Healthcare and biotech investing" },
  hedge_fund: { industry: "investing", label: "Hedge fund" },
  trading: { industry: "investing", label: "Quant and trading" },
  asset_management: { industry: "investing", label: "Asset management" },
  venture_creation: { industry: "biotech_pharma", label: "Biotech venture creation" },
  big_pharma: { industry: "biotech_pharma", label: "Pharma" },
  biotech: { industry: "biotech_pharma", label: "Biotech and life science tools" },
  big_tech: { industry: "tech", label: "Big tech" },
  tech_company: { industry: "tech", label: "Tech company" },
  health_tech: { industry: "tech", label: "Health and life science tech" },
} as const satisfies Record<string, { industry: Industry; label: string }>;
export type Segment = keyof typeof SEGMENTS;

/**
 * Estimated application window for a summer internship, by segment.
 * Months are 1–12; yearOffset is relative to the internship summer
 * (-1 = the calendar year before). Real dates vary by firm and year.
 */
export const WINDOWS: Record<Segment, { opens: number; closes: number; yearOffset: -1 | 0 }> = {
  mbb: { opens: 7, closes: 9, yearOffset: -1 },
  strategy_consulting: { opens: 8, closes: 10, yearOffset: -1 },
  big4_consulting: { opens: 8, closes: 11, yearOffset: -1 },
  economic_consulting: { opens: 8, closes: 11, yearOffset: -1 },
  life_sciences_consulting: { opens: 8, closes: 11, yearOffset: -1 },
  bulge_bracket: { opens: 1, closes: 4, yearOffset: -1 },
  elite_boutique: { opens: 1, closes: 4, yearOffset: -1 },
  middle_market_bank: { opens: 2, closes: 7, yearOffset: -1 },
  private_equity: { opens: 8, closes: 12, yearOffset: -1 },
  healthcare_investing: { opens: 1, closes: 4, yearOffset: 0 },
  hedge_fund: { opens: 7, closes: 10, yearOffset: -1 },
  trading: { opens: 7, closes: 10, yearOffset: -1 },
  asset_management: { opens: 8, closes: 11, yearOffset: -1 },
  venture_creation: { opens: 1, closes: 4, yearOffset: 0 },
  big_pharma: { opens: 9, closes: 1, yearOffset: -1 },
  biotech: { opens: 1, closes: 4, yearOffset: 0 },
  big_tech: { opens: 8, closes: 11, yearOffset: -1 },
  tech_company: { opens: 8, closes: 12, yearOffset: -1 },
  health_tech: { opens: 9, closes: 2, yearOffset: -1 },
};

export type Firm = {
  slug: string;
  name: string;
  segment: Segment;
  selectivity: 1 | 2 | 3;
  /** Headquarters city. */
  hq: string;
  /** True when the firm has offices in most major US cities. */
  national?: boolean;
  aliases?: string[];
  focus?: "healthcare"[];
};

const HC = ["healthcare"] as "healthcare"[];

export const FIRMS: Firm[] = [
  // Strategy consulting (MBB)
  { slug: "mckinsey", name: "McKinsey & Company", segment: "mbb", selectivity: 1, hq: "New York", national: true, aliases: ["McKinsey"] },
  { slug: "bcg", name: "Boston Consulting Group", segment: "mbb", selectivity: 1, hq: "Boston", national: true, aliases: ["BCG", "The Boston Consulting Group"] },
  { slug: "bain", name: "Bain & Company", segment: "mbb", selectivity: 1, hq: "Boston", national: true, aliases: ["Bain"] },

  // Strategy consulting
  { slug: "oliver-wyman", name: "Oliver Wyman", segment: "strategy_consulting", selectivity: 2, hq: "New York", national: true },
  { slug: "kearney", name: "Kearney", segment: "strategy_consulting", selectivity: 2, hq: "Chicago", national: true, aliases: ["A.T. Kearney"] },
  { slug: "lek", name: "L.E.K. Consulting", segment: "strategy_consulting", selectivity: 2, hq: "Boston", national: true, aliases: ["LEK", "L.E.K.", "LEK Consulting"], focus: HC },
  { slug: "roland-berger", name: "Roland Berger", segment: "strategy_consulting", selectivity: 2, hq: "Munich", aliases: [] },
  { slug: "strategy-and", name: "Strategy&", segment: "strategy_consulting", selectivity: 2, hq: "New York", national: true, aliases: ["Strategy& (PwC)"] },
  { slug: "accenture-strategy", name: "Accenture Strategy", segment: "strategy_consulting", selectivity: 2, hq: "New York", national: true },
  { slug: "simon-kucher", name: "Simon-Kucher", segment: "strategy_consulting", selectivity: 2, hq: "Boston", aliases: ["Simon-Kucher & Partners"] },
  { slug: "alvarez-marsal", name: "Alvarez & Marsal", segment: "strategy_consulting", selectivity: 2, hq: "New York", national: true, aliases: ["A&M"] },
  { slug: "alixpartners", name: "AlixPartners", segment: "strategy_consulting", selectivity: 2, hq: "New York", national: true },
  { slug: "huron", name: "Huron Consulting Group", segment: "strategy_consulting", selectivity: 3, hq: "Chicago", national: true, aliases: ["Huron"], focus: HC },
  { slug: "guidehouse", name: "Guidehouse", segment: "strategy_consulting", selectivity: 3, hq: "McLean", national: true, focus: HC },
  { slug: "booz-allen", name: "Booz Allen Hamilton", segment: "strategy_consulting", selectivity: 3, hq: "McLean", national: true, aliases: ["Booz Allen"] },
  { slug: "fti", name: "FTI Consulting", segment: "strategy_consulting", selectivity: 3, hq: "Washington DC", national: true, aliases: ["FTI"] },

  // Big Four and large consulting
  { slug: "deloitte", name: "Deloitte", segment: "big4_consulting", selectivity: 3, hq: "New York", national: true, aliases: ["Deloitte Consulting", "Monitor Deloitte"] },
  { slug: "pwc", name: "PwC", segment: "big4_consulting", selectivity: 3, hq: "New York", national: true, aliases: ["PricewaterhouseCoopers"] },
  { slug: "ey", name: "EY", segment: "big4_consulting", selectivity: 3, hq: "New York", national: true, aliases: ["Ernst & Young", "EY-Parthenon", "EY Parthenon"] },
  { slug: "kpmg", name: "KPMG", segment: "big4_consulting", selectivity: 3, hq: "New York", national: true },
  { slug: "accenture", name: "Accenture", segment: "big4_consulting", selectivity: 3, hq: "New York", national: true },
  { slug: "ibm-consulting", name: "IBM Consulting", segment: "big4_consulting", selectivity: 3, hq: "Armonk", national: true },

  // Economic consulting
  { slug: "analysis-group", name: "Analysis Group", segment: "economic_consulting", selectivity: 2, hq: "Boston", aliases: [], focus: HC },
  { slug: "cornerstone", name: "Cornerstone Research", segment: "economic_consulting", selectivity: 2, hq: "Menlo Park", aliases: ["Cornerstone"] },
  { slug: "cra", name: "Charles River Associates", segment: "economic_consulting", selectivity: 2, hq: "Boston", aliases: ["CRA"] },
  { slug: "nera", name: "NERA Economic Consulting", segment: "economic_consulting", selectivity: 3, hq: "New York", aliases: ["NERA"] },
  { slug: "brattle", name: "The Brattle Group", segment: "economic_consulting", selectivity: 2, hq: "Boston", aliases: ["Brattle"] },
  { slug: "compass-lexecon", name: "Compass Lexecon", segment: "economic_consulting", selectivity: 2, hq: "Chicago" },
  { slug: "bates-white", name: "Bates White", segment: "economic_consulting", selectivity: 2, hq: "Washington DC" },

  // Life sciences consulting
  { slug: "clearview", name: "ClearView Healthcare Partners", segment: "life_sciences_consulting", selectivity: 2, hq: "Boston", aliases: ["ClearView", "ClearView HCP"], focus: HC },
  { slug: "zs", name: "ZS Associates", segment: "life_sciences_consulting", selectivity: 2, hq: "Evanston", national: true, aliases: ["ZS"], focus: HC },
  { slug: "trinity", name: "Trinity Life Sciences", segment: "life_sciences_consulting", selectivity: 2, hq: "Waltham", aliases: ["Trinity"], focus: HC },
  { slug: "putnam", name: "Putnam (an Inizio company)", segment: "life_sciences_consulting", selectivity: 2, hq: "Boston", aliases: ["Putnam", "Putnam Associates"], focus: HC },
  { slug: "health-advances", name: "Health Advances", segment: "life_sciences_consulting", selectivity: 2, hq: "Boston", focus: HC },
  { slug: "iqvia-consulting", name: "IQVIA Consulting", segment: "life_sciences_consulting", selectivity: 3, hq: "Durham", national: true, aliases: ["IQVIA"], focus: HC },
  { slug: "blue-matter", name: "Blue Matter Consulting", segment: "life_sciences_consulting", selectivity: 2, hq: "San Francisco", aliases: ["Blue Matter"], focus: HC },
  { slug: "back-bay", name: "Back Bay Life Science Advisors", segment: "life_sciences_consulting", selectivity: 2, hq: "Boston", aliases: ["Back Bay"], focus: HC },
  { slug: "triangle-insights", name: "Triangle Insights Group", segment: "life_sciences_consulting", selectivity: 2, hq: "Durham", focus: HC },
  { slug: "stax", name: "Stax", segment: "life_sciences_consulting", selectivity: 3, hq: "Boston" },
  { slug: "lumanity", name: "Lumanity", segment: "life_sciences_consulting", selectivity: 3, hq: "Philadelphia", focus: HC },
  { slug: "avalere", name: "Avalere Health", segment: "life_sciences_consulting", selectivity: 3, hq: "Washington DC", aliases: ["Avalere"], focus: HC },
  { slug: "syneos-consulting", name: "Syneos Health Consulting", segment: "life_sciences_consulting", selectivity: 3, hq: "Morrisville", focus: HC },
  { slug: "defined-health", name: "Defined Health", segment: "life_sciences_consulting", selectivity: 3, hq: "Florham Park", focus: HC },

  // Bulge-bracket banks
  { slug: "goldman", name: "Goldman Sachs", segment: "bulge_bracket", selectivity: 1, hq: "New York", national: true, aliases: ["Goldman", "GS"] },
  { slug: "morgan-stanley", name: "Morgan Stanley", segment: "bulge_bracket", selectivity: 1, hq: "New York", national: true },
  { slug: "jpmorgan", name: "J.P. Morgan", segment: "bulge_bracket", selectivity: 1, hq: "New York", national: true, aliases: ["JPMorgan", "JPMorgan Chase", "JPMorgan Chase & Co."] },
  { slug: "bofa", name: "Bank of America", segment: "bulge_bracket", selectivity: 2, hq: "Charlotte", national: true, aliases: ["BofA", "BofA Securities"] },
  { slug: "citi", name: "Citi", segment: "bulge_bracket", selectivity: 2, hq: "New York", national: true, aliases: ["Citigroup", "Citibank"] },
  { slug: "barclays", name: "Barclays", segment: "bulge_bracket", selectivity: 2, hq: "London", national: true },
  { slug: "ubs", name: "UBS", segment: "bulge_bracket", selectivity: 2, hq: "Zurich", national: true },
  { slug: "deutsche-bank", name: "Deutsche Bank", segment: "bulge_bracket", selectivity: 2, hq: "Frankfurt", national: true },
  { slug: "wells-fargo", name: "Wells Fargo", segment: "bulge_bracket", selectivity: 2, hq: "San Francisco", national: true },

  // Elite boutiques
  { slug: "evercore", name: "Evercore", segment: "elite_boutique", selectivity: 1, hq: "New York" },
  { slug: "centerview", name: "Centerview Partners", segment: "elite_boutique", selectivity: 1, hq: "New York", aliases: ["Centerview"] },
  { slug: "lazard", name: "Lazard", segment: "elite_boutique", selectivity: 1, hq: "New York" },
  { slug: "pjt", name: "PJT Partners", segment: "elite_boutique", selectivity: 1, hq: "New York", aliases: ["PJT"] },
  { slug: "moelis", name: "Moelis & Company", segment: "elite_boutique", selectivity: 1, hq: "New York", aliases: ["Moelis"] },
  { slug: "perella", name: "Perella Weinberg Partners", segment: "elite_boutique", selectivity: 1, hq: "New York", aliases: ["Perella Weinberg", "PWP"] },
  { slug: "guggenheim", name: "Guggenheim Securities", segment: "elite_boutique", selectivity: 2, hq: "New York", aliases: ["Guggenheim"] },
  { slug: "qatalyst", name: "Qatalyst Partners", segment: "elite_boutique", selectivity: 1, hq: "San Francisco", aliases: ["Qatalyst"] },

  // Middle-market and healthcare banks
  { slug: "leerink", name: "Leerink Partners", segment: "middle_market_bank", selectivity: 2, hq: "Boston", aliases: ["Leerink", "SVB Securities"], focus: HC },
  { slug: "jefferies", name: "Jefferies", segment: "middle_market_bank", selectivity: 2, hq: "New York", national: true },
  { slug: "td-cowen", name: "TD Cowen", segment: "middle_market_bank", selectivity: 2, hq: "New York", aliases: ["Cowen"] },
  { slug: "piper-sandler", name: "Piper Sandler", segment: "middle_market_bank", selectivity: 3, hq: "Minneapolis", national: true },
  { slug: "william-blair", name: "William Blair", segment: "middle_market_bank", selectivity: 3, hq: "Chicago" },
  { slug: "houlihan-lokey", name: "Houlihan Lokey", segment: "middle_market_bank", selectivity: 2, hq: "Los Angeles", national: true, aliases: ["Houlihan"] },
  { slug: "rbc", name: "RBC Capital Markets", segment: "middle_market_bank", selectivity: 2, hq: "Toronto", national: true, aliases: ["RBC"] },
  { slug: "baird", name: "Robert W. Baird", segment: "middle_market_bank", selectivity: 3, hq: "Milwaukee", aliases: ["Baird"] },
  { slug: "harris-williams", name: "Harris Williams", segment: "middle_market_bank", selectivity: 2, hq: "Richmond" },
  { slug: "lincoln", name: "Lincoln International", segment: "middle_market_bank", selectivity: 3, hq: "Chicago" },
  { slug: "stifel", name: "Stifel", segment: "middle_market_bank", selectivity: 3, hq: "St. Louis", national: true },
  { slug: "raymond-james", name: "Raymond James", segment: "middle_market_bank", selectivity: 3, hq: "St. Petersburg", national: true },
  { slug: "cantor", name: "Cantor Fitzgerald", segment: "middle_market_bank", selectivity: 3, hq: "New York", aliases: ["Cantor"], focus: HC },
  { slug: "mizuho", name: "Mizuho Americas", segment: "middle_market_bank", selectivity: 3, hq: "New York", aliases: ["Mizuho", "Greenhill"] },

  // Private equity
  { slug: "blackstone", name: "Blackstone", segment: "private_equity", selectivity: 1, hq: "New York" },
  { slug: "kkr", name: "KKR", segment: "private_equity", selectivity: 1, hq: "New York" },
  { slug: "carlyle", name: "The Carlyle Group", segment: "private_equity", selectivity: 1, hq: "Washington DC", aliases: ["Carlyle"] },
  { slug: "apollo", name: "Apollo Global Management", segment: "private_equity", selectivity: 1, hq: "New York", aliases: ["Apollo"] },
  { slug: "bain-capital", name: "Bain Capital", segment: "private_equity", selectivity: 1, hq: "Boston" },
  { slug: "tpg", name: "TPG", segment: "private_equity", selectivity: 1, hq: "Fort Worth" },
  { slug: "warburg", name: "Warburg Pincus", segment: "private_equity", selectivity: 1, hq: "New York" },
  { slug: "general-atlantic", name: "General Atlantic", segment: "private_equity", selectivity: 1, hq: "New York" },
  { slug: "advent", name: "Advent International", segment: "private_equity", selectivity: 1, hq: "Boston", aliases: ["Advent"] },
  { slug: "thoma-bravo", name: "Thoma Bravo", segment: "private_equity", selectivity: 1, hq: "Chicago" },
  { slug: "ta-associates", name: "TA Associates", segment: "private_equity", selectivity: 1, hq: "Boston" },
  { slug: "welsh-carson", name: "Welsh, Carson, Anderson & Stowe", segment: "private_equity", selectivity: 1, hq: "New York", aliases: ["WCAS", "Welsh Carson"], focus: HC },

  // Healthcare and biotech investing
  { slug: "bain-capital-ls", name: "Bain Capital Life Sciences", segment: "healthcare_investing", selectivity: 1, hq: "Boston", focus: HC },
  { slug: "deerfield", name: "Deerfield Management", segment: "healthcare_investing", selectivity: 1, hq: "New York", aliases: ["Deerfield"], focus: HC },
  { slug: "ra-capital", name: "RA Capital Management", segment: "healthcare_investing", selectivity: 1, hq: "Boston", aliases: ["RA Capital"], focus: HC },
  { slug: "perceptive", name: "Perceptive Advisors", segment: "healthcare_investing", selectivity: 1, hq: "New York", aliases: ["Perceptive"], focus: HC },
  { slug: "orbimed", name: "OrbiMed", segment: "healthcare_investing", selectivity: 1, hq: "New York", focus: HC },
  { slug: "venrock", name: "Venrock", segment: "healthcare_investing", selectivity: 1, hq: "Palo Alto", focus: HC },
  { slug: "arch", name: "ARCH Venture Partners", segment: "healthcare_investing", selectivity: 1, hq: "Chicago", aliases: ["ARCH"], focus: HC },
  { slug: "atlas", name: "Atlas Venture", segment: "healthcare_investing", selectivity: 1, hq: "Cambridge", focus: HC },
  { slug: "polaris", name: "Polaris Partners", segment: "healthcare_investing", selectivity: 1, hq: "Boston", focus: HC },
  { slug: "f-prime", name: "F-Prime Capital", segment: "healthcare_investing", selectivity: 1, hq: "Cambridge", aliases: ["F-Prime"], focus: HC },
  { slug: "frazier", name: "Frazier Life Sciences", segment: "healthcare_investing", selectivity: 1, hq: "Seattle", focus: HC },
  { slug: "foresite", name: "Foresite Capital", segment: "healthcare_investing", selectivity: 1, hq: "San Francisco", aliases: ["Foresite"], focus: HC },
  { slug: "casdin", name: "Casdin Capital", segment: "healthcare_investing", selectivity: 1, hq: "New York", focus: HC },
  { slug: "longwood", name: "Longwood Fund", segment: "healthcare_investing", selectivity: 1, hq: "Boston", focus: HC },
  { slug: "mpm", name: "MPM BioImpact", segment: "healthcare_investing", selectivity: 1, hq: "Boston", aliases: ["MPM Capital"], focus: HC },
  { slug: "5am", name: "5AM Ventures", segment: "healthcare_investing", selectivity: 1, hq: "San Francisco", focus: HC },

  // Hedge funds
  { slug: "citadel", name: "Citadel", segment: "hedge_fund", selectivity: 1, hq: "Miami" },
  { slug: "millennium", name: "Millennium Management", segment: "hedge_fund", selectivity: 1, hq: "New York", aliases: ["Millennium"] },
  { slug: "point72", name: "Point72", segment: "hedge_fund", selectivity: 1, hq: "Stamford", aliases: ["Point72 Asset Management", "Point72 Academy"] },
  { slug: "de-shaw", name: "D. E. Shaw & Co.", segment: "hedge_fund", selectivity: 1, hq: "New York", aliases: ["D.E. Shaw", "DE Shaw"] },
  { slug: "two-sigma", name: "Two Sigma", segment: "hedge_fund", selectivity: 1, hq: "New York" },
  { slug: "bridgewater", name: "Bridgewater Associates", segment: "hedge_fund", selectivity: 1, hq: "Westport", aliases: ["Bridgewater"] },
  { slug: "balyasny", name: "Balyasny Asset Management", segment: "hedge_fund", selectivity: 1, hq: "Chicago", aliases: ["Balyasny", "BAM"] },
  { slug: "baker-bros", name: "Baker Bros. Advisors", segment: "hedge_fund", selectivity: 1, hq: "New York", aliases: ["Baker Brothers"], focus: HC },

  // Quant and trading
  { slug: "jane-street", name: "Jane Street", segment: "trading", selectivity: 1, hq: "New York" },
  { slug: "hrt", name: "Hudson River Trading", segment: "trading", selectivity: 1, hq: "New York", aliases: ["HRT"] },
  { slug: "jump", name: "Jump Trading", segment: "trading", selectivity: 1, hq: "Chicago", aliases: ["Jump"] },
  { slug: "citadel-securities", name: "Citadel Securities", segment: "trading", selectivity: 1, hq: "Miami" },
  { slug: "optiver", name: "Optiver", segment: "trading", selectivity: 1, hq: "Amsterdam" },
  { slug: "sig", name: "Susquehanna International Group", segment: "trading", selectivity: 1, hq: "Bala Cynwyd", aliases: ["SIG", "Susquehanna"] },
  { slug: "imc", name: "IMC Trading", segment: "trading", selectivity: 1, hq: "Amsterdam", aliases: ["IMC"] },
  { slug: "drw", name: "DRW", segment: "trading", selectivity: 1, hq: "Chicago" },

  // Asset management
  { slug: "fidelity", name: "Fidelity Investments", segment: "asset_management", selectivity: 2, hq: "Boston", national: true, aliases: ["Fidelity"] },
  { slug: "wellington", name: "Wellington Management", segment: "asset_management", selectivity: 2, hq: "Boston", aliases: ["Wellington"] },
  { slug: "blackrock", name: "BlackRock", segment: "asset_management", selectivity: 2, hq: "New York", national: true },
  { slug: "t-rowe", name: "T. Rowe Price", segment: "asset_management", selectivity: 2, hq: "Baltimore" },
  { slug: "vanguard", name: "Vanguard", segment: "asset_management", selectivity: 3, hq: "Malvern" },
  { slug: "state-street", name: "State Street", segment: "asset_management", selectivity: 3, hq: "Boston", aliases: ["State Street Global Advisors"] },
  { slug: "mfs", name: "MFS Investment Management", segment: "asset_management", selectivity: 3, hq: "Boston", aliases: ["MFS"] },

  // Biotech venture creation
  { slug: "flagship", name: "Flagship Pioneering", segment: "venture_creation", selectivity: 1, hq: "Cambridge", aliases: ["Flagship"], focus: HC },
  { slug: "third-rock", name: "Third Rock Ventures", segment: "venture_creation", selectivity: 1, hq: "Boston", aliases: ["Third Rock"], focus: HC },
  { slug: "versant", name: "Versant Ventures", segment: "venture_creation", selectivity: 1, hq: "San Francisco", aliases: ["Versant"], focus: HC },

  // Pharma
  { slug: "pfizer", name: "Pfizer", segment: "big_pharma", selectivity: 2, hq: "New York", focus: HC },
  { slug: "jnj", name: "Johnson & Johnson", segment: "big_pharma", selectivity: 2, hq: "New Brunswick", aliases: ["J&J", "Johnson and Johnson"], focus: HC },
  { slug: "merck", name: "Merck", segment: "big_pharma", selectivity: 2, hq: "Rahway", aliases: ["MSD", "Merck & Co."], focus: HC },
  { slug: "novartis", name: "Novartis", segment: "big_pharma", selectivity: 2, hq: "Basel", focus: HC },
  { slug: "genentech", name: "Genentech (Roche)", segment: "big_pharma", selectivity: 2, hq: "South San Francisco", aliases: ["Genentech", "Roche"], focus: HC },
  { slug: "abbvie", name: "AbbVie", segment: "big_pharma", selectivity: 2, hq: "North Chicago", focus: HC },
  { slug: "bms", name: "Bristol Myers Squibb", segment: "big_pharma", selectivity: 2, hq: "Princeton", aliases: ["BMS", "Bristol-Myers Squibb"], focus: HC },
  { slug: "lilly", name: "Eli Lilly and Company", segment: "big_pharma", selectivity: 2, hq: "Indianapolis", aliases: ["Lilly", "Eli Lilly"], focus: HC },
  { slug: "astrazeneca", name: "AstraZeneca", segment: "big_pharma", selectivity: 2, hq: "Cambridge, UK", aliases: ["AZ"], focus: HC },
  { slug: "sanofi", name: "Sanofi", segment: "big_pharma", selectivity: 2, hq: "Paris", focus: HC },
  { slug: "gsk", name: "GSK", segment: "big_pharma", selectivity: 2, hq: "London", aliases: ["GlaxoSmithKline"], focus: HC },
  { slug: "takeda", name: "Takeda", segment: "big_pharma", selectivity: 2, hq: "Tokyo", aliases: ["Takeda Pharmaceuticals", "Takeda Pharmaceutical Company"], focus: HC },
  { slug: "novo-nordisk", name: "Novo Nordisk", segment: "big_pharma", selectivity: 2, hq: "Bagsværd", focus: HC },
  { slug: "amgen", name: "Amgen", segment: "big_pharma", selectivity: 2, hq: "Thousand Oaks", focus: HC },
  { slug: "gilead", name: "Gilead Sciences", segment: "big_pharma", selectivity: 2, hq: "Foster City", aliases: ["Gilead"], focus: HC },
  { slug: "regeneron", name: "Regeneron", segment: "big_pharma", selectivity: 2, hq: "Tarrytown", focus: HC },
  { slug: "vertex", name: "Vertex Pharmaceuticals", segment: "big_pharma", selectivity: 2, hq: "Boston", aliases: ["Vertex"], focus: HC },
  { slug: "biogen", name: "Biogen", segment: "big_pharma", selectivity: 2, hq: "Cambridge", focus: HC },
  { slug: "moderna", name: "Moderna", segment: "big_pharma", selectivity: 2, hq: "Cambridge", focus: HC },
  { slug: "boehringer", name: "Boehringer Ingelheim", segment: "big_pharma", selectivity: 3, hq: "Ingelheim", focus: HC },
  { slug: "bayer", name: "Bayer", segment: "big_pharma", selectivity: 3, hq: "Leverkusen", focus: HC },

  // Biotech and life science tools
  { slug: "thermo-fisher", name: "Thermo Fisher Scientific", segment: "biotech", selectivity: 3, hq: "Waltham", national: true, aliases: ["Thermo Fisher"], focus: HC },
  { slug: "danaher", name: "Danaher", segment: "biotech", selectivity: 3, hq: "Washington DC", focus: HC },
  { slug: "illumina", name: "Illumina", segment: "biotech", selectivity: 2, hq: "San Diego", focus: HC },
  { slug: "ginkgo", name: "Ginkgo Bioworks", segment: "biotech", selectivity: 2, hq: "Boston", aliases: ["Ginkgo"], focus: HC },
  { slug: "alnylam", name: "Alnylam Pharmaceuticals", segment: "biotech", selectivity: 2, hq: "Cambridge", aliases: ["Alnylam"], focus: HC },
  { slug: "biomarin", name: "BioMarin", segment: "biotech", selectivity: 2, hq: "San Rafael", focus: HC },
  { slug: "sarepta", name: "Sarepta Therapeutics", segment: "biotech", selectivity: 2, hq: "Cambridge", aliases: ["Sarepta"], focus: HC },
  { slug: "intellia", name: "Intellia Therapeutics", segment: "biotech", selectivity: 2, hq: "Cambridge", aliases: ["Intellia"], focus: HC },
  { slug: "beam", name: "Beam Therapeutics", segment: "biotech", selectivity: 2, hq: "Cambridge", aliases: ["Beam"], focus: HC },
  { slug: "crispr", name: "CRISPR Therapeutics", segment: "biotech", selectivity: 2, hq: "Boston", focus: HC },
  { slug: "insmed", name: "Insmed", segment: "biotech", selectivity: 3, hq: "Bridgewater", focus: HC },
  { slug: "agilent", name: "Agilent Technologies", segment: "biotech", selectivity: 3, hq: "Santa Clara", aliases: ["Agilent"], focus: HC },

  // Big tech
  { slug: "google", name: "Google", segment: "big_tech", selectivity: 1, hq: "Mountain View", national: true, aliases: ["Alphabet"] },
  { slug: "microsoft", name: "Microsoft", segment: "big_tech", selectivity: 1, hq: "Redmond", national: true },
  { slug: "amazon", name: "Amazon", segment: "big_tech", selectivity: 2, hq: "Seattle", national: true, aliases: ["AWS"] },
  { slug: "apple", name: "Apple", segment: "big_tech", selectivity: 1, hq: "Cupertino" },
  { slug: "meta", name: "Meta", segment: "big_tech", selectivity: 1, hq: "Menlo Park", aliases: ["Facebook"] },
  { slug: "nvidia", name: "NVIDIA", segment: "big_tech", selectivity: 1, hq: "Santa Clara" },
  { slug: "salesforce", name: "Salesforce", segment: "big_tech", selectivity: 2, hq: "San Francisco", national: true },

  // Tech companies
  { slug: "stripe", name: "Stripe", segment: "tech_company", selectivity: 1, hq: "San Francisco" },
  { slug: "palantir", name: "Palantir", segment: "tech_company", selectivity: 1, hq: "Denver" },
  { slug: "databricks", name: "Databricks", segment: "tech_company", selectivity: 1, hq: "San Francisco" },
  { slug: "hubspot", name: "HubSpot", segment: "tech_company", selectivity: 2, hq: "Cambridge" },
  { slug: "wayfair", name: "Wayfair", segment: "tech_company", selectivity: 3, hq: "Boston" },
  { slug: "toast", name: "Toast", segment: "tech_company", selectivity: 3, hq: "Boston" },
  { slug: "draftkings", name: "DraftKings", segment: "tech_company", selectivity: 3, hq: "Boston" },
  { slug: "datadog", name: "Datadog", segment: "tech_company", selectivity: 2, hq: "New York" },
  { slug: "bloomberg", name: "Bloomberg", segment: "tech_company", selectivity: 2, hq: "New York" },

  // Health and life science tech
  { slug: "veeva", name: "Veeva Systems", segment: "health_tech", selectivity: 2, hq: "Pleasanton", aliases: ["Veeva"], focus: HC },
  { slug: "benchling", name: "Benchling", segment: "health_tech", selectivity: 2, hq: "San Francisco", focus: HC },
  { slug: "tempus", name: "Tempus AI", segment: "health_tech", selectivity: 2, hq: "Chicago", aliases: ["Tempus"], focus: HC },
  { slug: "epic", name: "Epic Systems", segment: "health_tech", selectivity: 3, hq: "Verona", aliases: ["Epic"], focus: HC },
  { slug: "flatiron", name: "Flatiron Health", segment: "health_tech", selectivity: 2, hq: "New York", aliases: ["Flatiron"], focus: HC },
  { slug: "athenahealth", name: "athenahealth", segment: "health_tech", selectivity: 3, hq: "Boston", focus: HC },
  { slug: "optum", name: "Optum", segment: "health_tech", selectivity: 3, hq: "Eden Prairie", national: true, aliases: ["UnitedHealth Group"], focus: HC },
];

export function segmentIndustry(segment: Segment): Industry {
  return SEGMENTS[segment].industry;
}
