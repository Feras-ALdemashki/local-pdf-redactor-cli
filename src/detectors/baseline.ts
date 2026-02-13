export type ScanCounts = Record<string, number>;
// to tell how many time the Exp appears
function countRegexMatches(text: string, re: RegExp): number {
  let count = 0;
  // Reset lastIndex so a global/sticky regex starts searching from the beginning each time.
  re.lastIndex = 0;
  while (re.exec(text)) count++;
  return count;
}

function normalizeTerm(s: string): string {
  return s.trim();
}
// this function to take the term and turn into regex to search and count inside a text
function countTermOccurrences(text: string, term: string): number {
  const t = normalizeTerm(term);
  if (!t) return 0;

  // Escape for regex so it will deal with it as input and not regex expressions
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // crete new regex based on the term/ and then add the g and i flag to the regex
  const re = new RegExp(`(?<!\\w)${escaped}(?!\\w)`, "g");

  return countRegexMatches(text, re);
}

//  basic Luhn check for credit card candidates
function luhnCheck(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  // Process from right to left
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;

    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function countCreditCards(text: string): number {
  // Candidate groups of 13–19 digits with optional spaces/dashes
  const candidates = text.match(/\b(?:\d[ -]*?){13,19}\b/g) ?? [];
  let count = 0;

  for (const c of candidates) {
    const digits = c.replace(/[ -]/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    if (luhnCheck(digits)) count++;
  }
  return count;
}

export function scanBaseline(text: string, customTerms: string[]): ScanCounts {
  const counts: ScanCounts = {};

  // Email (practical, not perfect)
  counts.email = countRegexMatches(
    text,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  );

  // URLs (basic)
  counts.url = countRegexMatches(text, /\b(?:https?:\/\/|www\.)[^\s)]+/gi);

  // IPv4
  counts.ipv4 = countRegexMatches(
    text,
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  );

  // Phone-ish (will be refined later)
  counts.phone = countRegexMatches(text, /\b\+?\d[\d\s().-]{7,}\d\b/g);

  // IBAN-ish (structure only for scan)
  counts.iban = countRegexMatches(text, /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g);

  // Credit cards (Luhn)
  counts.creditcard = countCreditCards(text);

  // Custom terms
  let customTotal = 0;
  for (const term of customTerms)
    customTotal += countTermOccurrences(text, term);
  counts.custom_terms = customTotal;

  return counts;
}
