// Value formatters for Netchex import fields. Pure functions; each returns the
// formatted string, or null if the value cannot be coerced. Callers decide
// whether null becomes a blank cell or a validation issue.

export function toStringOrBlank(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

const MMDDYYYY = /^(0?[1-9]|1[0-2])[\/-](0?[1-9]|[12]\d|3[01])[\/-](\d{2}|\d{4})$/;
const YYYYMMDD = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/;

// Accepts: Date objects, Excel serial numbers, MM/DD/YYYY, M/D/YY, YYYY-MM-DD.
// Returns MM/DD/YYYY or null.
export function formatDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return formatJsDate(value);

  // Excel date serial — only treat plain numbers within a plausible range as dates
  if (typeof value === "number" && value > 1000 && value < 90000) {
    // Excel epoch: 1899-12-30 (accounts for the 1900 leap-year bug)
    const ms = (value - 25569) * 86400 * 1000;
    return formatJsDate(new Date(ms));
  }

  const s = String(value).trim();
  if (!s) return null;
  let m = s.match(MMDDYYYY);
  if (m) {
    const mm = m[1].padStart(2, "0");
    const dd = m[2].padStart(2, "0");
    let yyyy = m[3];
    if (yyyy.length === 2) yyyy = (Number(yyyy) >= 50 ? "19" : "20") + yyyy;
    return `${mm}/${dd}/${yyyy}`;
  }
  m = s.match(YYYYMMDD);
  if (m) {
    const yyyy = m[1];
    const mm = m[2].padStart(2, "0");
    const dd = m[3].padStart(2, "0");
    return `${mm}/${dd}/${yyyy}`;
  }
  // last-ditch: Date.parse
  const ms = Date.parse(s);
  if (!Number.isNaN(ms)) return formatJsDate(new Date(ms));
  return null;
}

function formatJsDate(d: Date): string {
  // xlsx with cellDates is timezone-flaky — in non-US zones it returns Dates
  // a few seconds shy of the correct local midnight. Round to the nearest
  // local day, then read in UTC for stable output across machines.
  const localMs = d.getTime() - d.getTimezoneOffset() * 60000;
  const dayMs = 86400000;
  const rounded = new Date(Math.round(localMs / dayMs) * dayMs);
  const mm = String(rounded.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(rounded.getUTCDate()).padStart(2, "0");
  const yyyy = String(rounded.getUTCFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

// SSN: returns XXX-XX-XXXX. Accepts 9 digits with or without dashes, plus
// already-formatted strings. Null on anything else.
export function formatSsn(value: unknown): string | null {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

// Zip: returns XXXXX or XXXXX-XXXX. Strips whitespace; accepts 5 or 9 digits.
export function formatZip(value: unknown): string | null {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 5) return digits;
  if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return null;
}

// Splits a 10-digit phone (any common formatting) into area code + XXX-XXXX.
// Returns null if the input doesn't have 10 digits.
export function splitPhone(
  value: unknown,
): { areaCode: string; number: string } | null {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length !== 10) return null;
  return {
    areaCode: digits.slice(0, 3),
    number: `${digits.slice(3, 6)}-${digits.slice(6)}`,
  };
}

// Strips $ , and surrounding whitespace; preserves decimal point.
export function formatMoney(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  const s = String(value).replace(/[$,\s]/g, "");
  if (!s) return null;
  // accept anything parseable as a number; emit as-is (preserves "97913.92")
  if (Number.isNaN(Number(s))) return null;
  return s;
}
