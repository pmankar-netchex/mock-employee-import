import Fuse from "fuse.js";
import { NETCHEX_FIELDS, type NetchexFieldKey } from "./netchex-spec";
import type { ColumnMapping } from "./types";

// Aliases give the matcher synonyms to consider beyond fuzzy header similarity.
// Each entry is a Netchex field key -> list of common client-side synonyms.
const ALIASES: Partial<Record<NetchexFieldKey, string[]>> = {
  firstName: ["first name", "fname", "given name"],
  middleName: ["middle name", "middle initial", "mi"],
  lastName: ["last name", "lname", "surname", "family name"],
  birthDate: ["dob", "birth date", "date of birth", "birthday"],
  sex: ["sex", "gender"],
  maritalStatus: ["marital status", "marital"],
  ssn: ["ssn", "social security", "taxpayer id", "tax id", "fed id"],
  streetAddress1: ["address 1", "street 1", "wrkraddrline1", "address line 1"],
  streetAddress2: ["address 2", "street 2", "wrkraddrline2", "address line 2"],
  city: ["city", "wrkraddrcity"],
  state: ["state", "state/province", "wrkraddrstprov"],
  zipCode: ["zip", "postal code", "zip code", "wrkraddrzipfrmtd"],
  areaCode: ["area code"],
  phoneNumber: ["home phone", "phone", "phone number"],
  hireDate: ["hire date", "original hire date", "most recent hire date"],
  stateWithholding: ["state withholding", "withholding state"],
  stateUnemployment: ["state unemployment", "sui work state", "sui state"],
  employeeStatus: ["employee status", "full-time/part-time", "status"],
  jobCode: ["job code", "home job"],
  payrollGroupCode: ["payroll group", "pay frequency", "payroll schedule"],
  rateAmount: [
    "annual wage",
    "hourly rate",
    "salary",
    "pay rate 1",
    "hourly or salary amounts",
  ],
  federalMaritalStatus: ["federal filing status", "federal marital status"],
  federalExemptions: [
    "federal number of withholding allowances",
    "federal exemptions",
  ],
  stateMaritalStatus: ["state filing status", "state marital status"],
  stateExemptions: ["state exemptions", "state allowances"],
  classification: ["employee classification", "employee type", "classification"],
  position: ["position", "job title", "title"],
  termDate: ["termination date", "term date", "last day worked"],
  personalEmail: ["personal email", "email", "personal email address"],
  cellPhoneNumber: ["cell phone", "mobile phone", "cell phone number"],
  cellPhoneAreaCode: ["cell phone area code"],
  primaryContactMethod: ["primary contact method", "preferred contact"],
  race: ["race", "ethnic origin", "ethnicity"],
  eeoClass: ["eeo class", "eeoclass", "eeo-1 category"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type ColumnSuggestion = {
  column: string;
  score: number; // 0 (best) → 1 (worst)
};

export type FieldSuggestion = {
  key: NetchexFieldKey;
  top: ColumnSuggestion | null;
  ranked: ColumnSuggestion[];
};

export function suggestForField(
  fieldKey: NetchexFieldKey,
  clientHeaders: string[],
  fuse: Fuse<string>,
): FieldSuggestion {
  const field = NETCHEX_FIELDS.find((f) => f.key === fieldKey);
  if (!field) return { key: fieldKey, top: null, ranked: [] };

  const queries = [field.label, ...(ALIASES[fieldKey] ?? [])].map(normalize);

  const scored = new Map<string, number>();
  for (const q of queries) {
    const results = fuse.search(q);
    for (const r of results) {
      const prev = scored.get(r.item);
      if (prev == null || (r.score ?? 1) < prev) {
        scored.set(r.item, r.score ?? 1);
      }
    }
  }

  // Exact-match boost: if a header is identical (after normalization) to any
  // query, score it 0.
  for (const h of clientHeaders) {
    const nh = normalize(h);
    if (queries.includes(nh)) scored.set(h, 0);
  }

  const ranked = [...scored.entries()]
    .map(([column, score]) => ({ column, score }))
    .sort((a, b) => a.score - b.score);

  return {
    key: fieldKey,
    top: ranked[0] ?? null,
    ranked,
  };
}

export function suggestMapping(clientHeaders: string[]): {
  suggestions: FieldSuggestion[];
  autoMapping: ColumnMapping;
} {
  const normalizedHeaders = clientHeaders.map(normalize);
  const fuse = new Fuse(normalizedHeaders, {
    includeScore: true,
    threshold: 0.45,
    distance: 100,
    ignoreLocation: true,
  });
  // Map normalized->original for lookups
  const denormalize = new Map<string, string>();
  for (let i = 0; i < normalizedHeaders.length; i++) {
    denormalize.set(normalizedHeaders[i], clientHeaders[i]);
  }
  // Re-wrap fuse search to return original headers
  const wrappedFuse = {
    search(q: string) {
      return fuse.search(q).map((r) => ({
        item: denormalize.get(r.item) ?? r.item,
        score: r.score,
      }));
    },
  } as unknown as Fuse<string>;

  const suggestions: FieldSuggestion[] = [];
  const autoMapping: ColumnMapping = {};

  // Greedy: each client column maps to at most one Netchex field.
  // Walk required fields first to give them priority.
  const fieldsByPriority = [...NETCHEX_FIELDS].sort((a, b) => {
    const aReq = a.required === "required" ? 0 : 1;
    const bReq = b.required === "required" ? 0 : 1;
    return aReq - bReq;
  });

  const used = new Set<string>();
  for (const field of fieldsByPriority) {
    if (field.isSpacer) {
      autoMapping[field.key] = { source: "unmapped" };
      continue;
    }
    // Direct deposit fields will be handled in a separate workflow; don't
    // burn fuzzy-match candidates on them here.
    if ((field.category ?? "newHire") === "directDeposit") {
      autoMapping[field.key] = { source: "unmapped" };
      continue;
    }
    const s = suggestForField(field.key as NetchexFieldKey, clientHeaders, wrappedFuse);
    suggestions.push(s);
    const pick = s.ranked.find((r) => !used.has(r.column));
    if (pick && pick.score <= 0.45) {
      autoMapping[field.key] = { source: "column", column: pick.column };
      used.add(pick.column);
    } else {
      autoMapping[field.key] = { source: "unmapped" };
    }
  }

  // Restore original spec order in suggestions.
  suggestions.sort((a, b) => {
    const aIdx = NETCHEX_FIELDS.findIndex((f) => f.key === a.key);
    const bIdx = NETCHEX_FIELDS.findIndex((f) => f.key === b.key);
    return aIdx - bIdx;
  });

  return { suggestions, autoMapping };
}
