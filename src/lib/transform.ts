import { NETCHEX_FIELDS, type NetchexFieldKey } from "./netchex-spec";
import {
  formatDate,
  formatSsn,
  formatZip,
  formatMoney,
  splitPhone,
} from "./formatters";
import type {
  CellOverrides,
  ColumnMapping,
  NetchexRecord,
  TransformResult,
  ValidationIssue,
  ValueMapping,
} from "./types";

// Field-format keys that get auto-formatted in the transform pass.
const DATE_FIELDS = new Set<NetchexFieldKey>([
  "birthDate",
  "hireDate",
  "termDate",
  "ddEffectiveDate",
]);

const MONEY_FIELDS = new Set<NetchexFieldKey>([
  "rateAmount",
  "extraFedDollars",
  "extraStateDollars",
  "fedDependentCredit",
  "fedOtherIncome",
  "fedDeductions",
  "stateDependentCredit",
  "stateOtherIncome",
  "stateDeductions",
  "ddPartialAmount",
]);

function rawCell(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
  key: NetchexFieldKey,
): string {
  const entry = mapping[key];
  if (!entry || entry.source === "unmapped") return "";
  if (entry.source === "constant") return entry.value;
  const v = row[entry.column];
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function applyValueMapping(
  raw: string,
  key: NetchexFieldKey,
  valueMapping: ValueMapping,
): string {
  if (!raw) return "";
  const map = valueMapping[key];
  if (!map) return raw;
  return map[raw] ?? raw;
}

export function transform(input: {
  rows: Record<string, unknown>[];
  columnMapping: ColumnMapping;
  valueMapping?: ValueMapping;
  cellOverrides?: CellOverrides;
}): TransformResult {
  const { rows, columnMapping } = input;
  const valueMapping = input.valueMapping ?? {};
  const overrides = input.cellOverrides ?? {};
  const records: NetchexRecord[] = [];
  const issues: ValidationIssue[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const record = {} as NetchexRecord;

    // Build raw values once per field.
    for (const field of NETCHEX_FIELDS) {
      if (field.isSpacer) {
        record[field.key as NetchexFieldKey] = "";
        continue;
      }
      const key = field.key as NetchexFieldKey;
      let value = applyValueMapping(rawCell(row, columnMapping, key), key, valueMapping);

      if (value && DATE_FIELDS.has(key)) {
        const d = formatDate(
          // re-read original (could be a Date object) before stringification lost type info
          getRawTyped(row, columnMapping, key) ?? value,
        );
        if (d) value = d;
        else issues.push({ rowIndex: i, fieldKey: key, severity: "warning", message: `Could not parse date: "${value}"` });
      }

      if (value && key === "ssn") {
        const s = formatSsn(value);
        if (s) value = s;
        else issues.push({ rowIndex: i, fieldKey: key, severity: "warning", message: `SSN not 9 digits: "${value}"` });
      }

      if (value && key === "zipCode") {
        const z = formatZip(value);
        if (z) value = z;
        else issues.push({ rowIndex: i, fieldKey: key, severity: "warning", message: `Zip not 5 or 9 digits: "${value}"` });
      }

      if (value && MONEY_FIELDS.has(key)) {
        const m = formatMoney(value);
        if (m) value = m;
      }

      record[key] = value;
    }

    splitFullNameIfShared(record, columnMapping, row);

    // Phone splitting: if Area Code or Phone Number is mapped from a single
    // combined column or arrives as 10 digits, split into the two output cols.
    splitIfNeeded(record, "areaCode", "phoneNumber");
    splitIfNeeded(record, "cellPhoneAreaCode", "cellPhoneNumber");

    // Apply per-cell overrides last — they're explicit user fixes from the
    // Preview screen and should win over everything else.
    const rowOverrides = overrides[i];
    if (rowOverrides) {
      for (const [k, v] of Object.entries(rowOverrides)) {
        record[k as NetchexFieldKey] = v;
      }
    }

    // Validate required fields (non-conditional).
    for (const field of NETCHEX_FIELDS) {
      if (field.required !== "required") continue;
      if (field.isSpacer) continue;
      if (!record[field.key as NetchexFieldKey]) {
        issues.push({
          rowIndex: i,
          fieldKey: field.key as NetchexFieldKey,
          severity: "error",
          message: `Required field "${field.label}" is empty`,
        });
      }
    }

    // Conditional-required validation.
    validateConditional(i, record, issues);

    records.push(record);
  }

  return { records, issues };
}

function validateConditional(
  rowIndex: number,
  record: NetchexRecord,
  issues: ValidationIssue[],
) {
  const need = (key: NetchexFieldKey, label: string, why: string) => {
    if (!record[key]) {
      issues.push({
        rowIndex,
        fieldKey: key,
        severity: "error",
        message: `"${label}" required: ${why}`,
      });
    }
  };

  // Primary Contact Method drives email/phone requirements.
  const pcm = record.primaryContactMethod;
  if (pcm === "E") {
    need("personalEmail", "Personal Email Address", "Primary Contact Method = E");
  } else if (pcm === "P") {
    need("cellPhoneAreaCode", "Cell Phone Area Code", "Primary Contact Method = P");
    need("cellPhoneNumber", "Cell Phone Number", "Primary Contact Method = P");
  }

  // TIP employees must declare State Min Wage.
  if (record.classification === "TIP") {
    need("stateMinWage", "State Min Wage", "Classification = TIP");
  }

  // Direct deposit block: if any DD field has a value, all required DD fields
  // must be filled.
  const ddFields: NetchexFieldKey[] = [
    "ddOrder",
    "ddRoutingNumber",
    "ddAccountNumber",
    "ddAccountType",
    "ddEffectiveDate",
    "ddStatus",
    "ddDepositAmount",
  ];
  const ddTouched = ddFields.some((k) => !!record[k]);
  if (ddTouched) {
    const labels: Partial<Record<NetchexFieldKey, string>> = {
      ddOrder: "Order",
      ddRoutingNumber: "Routing Number",
      ddAccountNumber: "Account Number",
      ddAccountType: "Account Type",
      ddEffectiveDate: "Effective Date",
      ddStatus: "Status",
      ddDepositAmount: "Deposit amount",
    };
    for (const k of ddFields) {
      need(k, labels[k] ?? k, "direct deposit fields are partially filled");
    }
  }

  // Partial deposit needs amount + type.
  if (record.ddDepositAmount === "Partial") {
    need("ddPartialAmount", "Partial Amount", "Deposit amount = Partial");
    need("ddPartialAmountType", "Partial Amount Type", "Deposit amount = Partial");
  }
}

// If firstName and lastName are mapped to the same source column, the user
// intends for the tool to split that column. "Last, First Middle" wins if a
// comma is present; otherwise "First Middle Last" with all middle tokens
// concatenated into middleName.
function splitFullNameIfShared(
  record: NetchexRecord,
  mapping: ColumnMapping,
  row: Record<string, unknown>,
) {
  const fn = mapping.firstName;
  const ln = mapping.lastName;
  if (!fn || !ln) return;
  if (fn.source !== "column" || ln.source !== "column") return;
  if (fn.column !== ln.column) return;

  const raw = row[fn.column];
  if (raw == null) return;
  const full = String(raw).trim();
  if (!full) return;

  let first = "";
  let middle = "";
  let last = "";

  if (full.includes(",")) {
    const [lastPart, restPart = ""] = full.split(",", 2).map((s) => s.trim());
    last = lastPart;
    const restTokens = restPart.split(/\s+/).filter(Boolean);
    if (restTokens.length === 0) {
      // no first name available
    } else if (restTokens.length === 1) {
      first = restTokens[0];
    } else {
      first = restTokens[0];
      middle = restTokens.slice(1).join(" ");
    }
  } else {
    const tokens = full.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      last = tokens[0];
    } else if (tokens.length === 2) {
      first = tokens[0];
      last = tokens[1];
    } else {
      first = tokens[0];
      last = tokens[tokens.length - 1];
      middle = tokens.slice(1, -1).join(" ");
    }
  }

  record.firstName = first;
  record.lastName = last;
  // Only fill middleName if its own column-mapping is empty/same-source —
  // otherwise the user mapped middle name explicitly and we shouldn't clobber.
  const mn = mapping.middleName;
  const middleFromSameCol =
    !mn ||
    mn.source === "unmapped" ||
    (mn.source === "column" && mn.column === fn.column);
  if (middle && middleFromSameCol) record.middleName = middle;
}

function getRawTyped(
  row: Record<string, unknown>,
  mapping: ColumnMapping,
  key: NetchexFieldKey,
): unknown {
  const entry = mapping[key];
  if (!entry || entry.source !== "column") return null;
  return row[entry.column];
}

function splitIfNeeded(
  record: NetchexRecord,
  areaKey: NetchexFieldKey,
  numberKey: NetchexFieldKey,
) {
  const area = record[areaKey];
  const number = record[numberKey];
  // If number cell contains a 10-digit phone and area is empty, split it.
  if ((!area || area === "") && number) {
    const split = splitPhone(number);
    if (split) {
      record[areaKey] = split.areaCode;
      record[numberKey] = split.number;
    }
  } else if (number) {
    // If number is 7 digits, leave as XXX-XXXX; if 10 digits, re-split.
    const split = splitPhone(number);
    if (split) {
      record[numberKey] = split.number;
      if (!area) record[areaKey] = split.areaCode;
    } else {
      // 7-digit only — normalize to XXX-XXXX if it's bare digits
      const digits = number.replace(/\D/g, "");
      if (digits.length === 7) {
        record[numberKey] = `${digits.slice(0, 3)}-${digits.slice(3)}`;
      }
    }
  }
}
