// Auto-prefill lookups for constrained Netchex fields. Each function takes a
// raw client value and returns the canonical Netchex value (or null if no
// confident match). Used by the value-mapping UI to seed dropdowns.

import { lookupStateCode } from "./state-abbreviations";
import type { NetchexFieldKey } from "./netchex-spec";

function normalize(v: string): string {
  return v.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

type Resolver = (raw: string) => string | null;

const SEX: Resolver = (raw) => {
  const n = normalize(raw);
  if (["m", "male", "man"].includes(n)) return "M";
  if (["f", "female", "woman"].includes(n)) return "F";
  return null;
};

const MARITAL: Resolver = (raw) => {
  const n = normalize(raw);
  if (
    [
      "s",
      "single",
      "single or married filing separately",
      "married filing separately",
      "mfs",
      "head of household",
      "hoh",
      "qualifying widow",
      "qualifying widower",
    ].includes(n)
  )
    return "S";
  if (
    [
      "m",
      "married",
      "married filing jointly",
      "mfj",
      "married jointly",
    ].includes(n)
  )
    return "M";
  return null;
};

const STATE: Resolver = (raw) => lookupStateCode(raw);

const EMP_STATUS: Resolver = (raw) => {
  const n = normalize(raw);
  if (["full time", "full-time", "ft", "regular full time", "rft"].includes(n))
    return "RFT";
  if (["part time", "part-time", "pt", "regular part time", "rpt"].includes(n))
    return "RPT";
  return null;
};

const CLASSIFICATION: Resolver = (raw) => {
  const n = normalize(raw);
  if (["w2", "w 2"].includes(n)) return "W2";
  if (n === "1099") return "1099";
  if (["tip", "tipped"].includes(n)) return "TIP";
  return null;
};

const CONTACT_METHOD: Resolver = (raw) => {
  const n = normalize(raw);
  if (["e", "email"].includes(n)) return "E";
  if (["p", "phone", "cell", "mobile", "cell phone", "text"].includes(n))
    return "P";
  return null;
};

const ACCOUNT_TYPE: Resolver = (raw) => {
  const n = normalize(raw);
  if (["c", "checking", "chk"].includes(n)) return "Checking";
  if (["s", "savings", "sav"].includes(n)) return "Savings";
  return null;
};

const DD_STATUS: Resolver = (raw) => {
  const n = normalize(raw);
  if (n === "deposit") return "Deposit";
  if (n === "prenote") return "Prenote";
  return null;
};

const DD_DEPOSIT_AMOUNT: Resolver = (raw) => {
  const n = normalize(raw);
  if (n === "balance") return "Balance";
  if (n === "partial") return "Partial";
  return null;
};

const DD_PARTIAL_AMOUNT_TYPE: Resolver = (raw) => {
  const n = normalize(raw);
  if (["full dollar", "dollar", "amount"].includes(n)) return "Full Dollar";
  if (["percentage", "percent", "pct"].includes(n)) return "Percentage";
  return null;
};

const YN: Resolver = (raw) => {
  const n = normalize(raw);
  if (["y", "yes", "true", "1"].includes(n)) return "Y";
  if (["n", "no", "false", "0"].includes(n)) return "N";
  return null;
};

const ORDER: Resolver = (raw) => {
  const n = normalize(raw);
  if (n === "1" || n === "primary") return "1";
  return null;
};

const RACE: Resolver = (raw) => {
  const n = normalize(raw);
  const map: Record<string, string> = {
    asian: "Asian",
    "black or african american": "Black or African American",
    black: "Black or African American",
    "african american": "Black or African American",
    "hispanic or latino": "Hispanic or Latino",
    hispanic: "Hispanic or Latino",
    latino: "Hispanic or Latino",
    "american indian or alaska native": "American Indian or Alaska Native",
    "american indian": "American Indian or Alaska Native",
    "native american": "American Indian or Alaska Native",
    "alaska native": "American Indian or Alaska Native",
    "none specified": "None Specified",
    none: "None Specified",
    "not specified": "None Specified",
    "two or more races": "Two or More Races",
    "native hawaiian or other pacific islander":
      "Native Hawaiian or Other Pacific Islander",
    "native hawaiian": "Native Hawaiian or Other Pacific Islander",
    "pacific islander": "Native Hawaiian or Other Pacific Islander",
    white: "White",
    caucasian: "White",
  };
  return map[n] ?? null;
};

const EEO_CLASS: Resolver = (raw) => {
  // Race-style fuzzy isn't safe here; require near-exact match.
  const n = normalize(raw);
  const map: Record<string, string> = {
    "administrative support workers": "Administrative Support Workers",
    "craft workers": "Craft Workers",
    "executive senior level officials and managers":
      "Executive/Senior Level Officials and Managers",
    "executive/senior level officials and managers":
      "Executive/Senior Level Officials and Managers",
    "laborers and helpers": "Laborers and Helpers",
    "none specified": "None Specified",
    operatives: "Operatives",
    professionals: "Professionals",
    "sales workers": "Sales Workers",
    "service workers": "Service Workers",
    technicians: "Technicians",
  };
  return map[n] ?? null;
};

export const RESOLVERS: Partial<Record<NetchexFieldKey, Resolver>> = {
  sex: SEX,
  maritalStatus: MARITAL,
  federalMaritalStatus: MARITAL,
  stateMaritalStatus: MARITAL,
  priLocalMaritalStatus: MARITAL,
  secLocalMaritalStatus: MARITAL,
  state: STATE,
  stateWithholding: STATE,
  stateUnemployment: STATE,
  stateMinWage: STATE,
  employeeStatus: EMP_STATUS,
  classification: CLASSIFICATION,
  primaryContactMethod: CONTACT_METHOD,
  ddAccountType: ACCOUNT_TYPE,
  ddStatus: DD_STATUS,
  ddDepositAmount: DD_DEPOSIT_AMOUNT,
  ddPartialAmountType: DD_PARTIAL_AMOUNT_TYPE,
  form2020W4: YN,
  fedMultipleJob: YN,
  stateMultipleJob: YN,
  ddOrder: ORDER,
  race: RACE,
  eeoClass: EEO_CLASS,
};

export function autoResolveValue(
  fieldKey: NetchexFieldKey,
  raw: string,
): string | null {
  const fn = RESOLVERS[fieldKey];
  if (!fn) return null;
  return fn(raw);
}
