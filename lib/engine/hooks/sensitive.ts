/**
 * Post-filter for quotes (spec section 11, "Never store or show"). A quote
 * that looks like it holds a home address, a phone number or a personal
 * life detail is dropped, however good the overlap.
 */
const PATTERNS: RegExp[] = [
  // Phone numbers: (555) 555-0100, 555-555-0100, +1 555 555 0100
  /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/,
  // Street addresses: "12 Elm Street", "450 Main St."
  /\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|way|place|pl|terrace)\b\.?/i,
  // Family, health, religion, politics, orientation, immigration
  /\b(wife|husband|spouse|son|daughter|children|kids|married|divorced|pregnan\w*|widow\w*)\b/i,
  /\b(diagnos\w*|illness|disease|disorder|therapy|rehab\w*|recovery from|survivor)\b/i,
  /\b(church|mosque|synagogue|temple|parish|faith|religio\w*|bible|quran|torah)\b/i,
  /\b(democrat\w*|republican\w*|political|campaign volunteer|gop)\b/i,
  /\b(gay|lesbian|bisexual|transgender|queer|lgbtq?\+?)\b/i,
  /\b(immigra\w*|undocumented|visa status|green card|daca|refugee|asylum)\b/i,
];

export function isSensitive(quote: string): boolean {
  return PATTERNS.some((re) => re.test(quote));
}
