export const regex = {
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  url: /\b(?:https?:\/\/|www\.)[^\s)]+/gi,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  phone:
    /(?<!\d)(?:(?:\(\s*)?(?:\+31|0031)(?:\s*\))?\s*(?:\(0\)\s*)?6|0\s*6)(?:[\s-]*\d){8}(?!\d)/g,
  iban: /\b[A-Z]{2}\d{2}(?:[\s\u00A0-]?[A-Z0-9]){11,30}\b/g,
} as const;

export type RegexKey = keyof typeof regex;
