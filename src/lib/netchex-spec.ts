// Source of truth for the Netchex New Hire Import file format.
// Mirrors the official NewHireImportSpecification.xls layout: 67 named fields
// plus one intentional blank spacer column at index 47, for a total of 68
// output columns.

export type Requirement =
  | "required"
  | "optional"
  | "conditional"; // required only when a related condition is met (see conditionalRule)

export type FieldGroup =
  | "Identity"
  | "Org Codes"
  | "Address & Phone"
  | "Employment"
  | "Tax Withholding"
  | "Position & Schedule"
  | "Contact"
  | "EEO & Direct Deposit"
  | "2020 Form W-4";

export const FIELD_GROUPS: readonly FieldGroup[] = [
  "Identity",
  "Org Codes",
  "Address & Phone",
  "Employment",
  "Tax Withholding",
  "Position & Schedule",
  "Contact",
  "EEO & Direct Deposit",
  "2020 Form W-4",
];

export type NetchexField = {
  key: string;
  label: string; // exact header text emitted in the CSV
  order: number; // 0-indexed column position
  required: Requirement;
  conditionalRule?: string;
  format?: string;
  allowedValues?: readonly string[];
  description: string;
  isSpacer?: boolean;
};

// Logical grouping by output-CSV order — used by the Preview screen to slice
// the 68-column table into manageable tabs.
export function groupForOrder(order: number): FieldGroup {
  if (order <= 7) return "Identity";
  if (order <= 11) return "Org Codes";
  if (order <= 18) return "Address & Phone";
  if (order <= 25) return "Employment";
  if (order <= 34) return "Tax Withholding";
  if (order <= 42) return "Position & Schedule";
  if (order <= 46) return "Contact";
  if (order <= 58) return "EEO & Direct Deposit";
  return "2020 Form W-4";
}

export function fieldsForGroup(group: FieldGroup): NetchexField[] {
  return NETCHEX_FIELDS.filter((f) => groupForOrder(f.order) === group);
}

export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI",
  "WY",
] as const;

export const YN = ["Y", "N"] as const;

export const NETCHEX_FIELDS: readonly NetchexField[] = [
  { key: "companyCode", label: "Company Code", order: 0, required: "required", description: "3-digit alpha/numeric Co Code provided by Netchex." },
  { key: "firstName", label: "First Name", order: 1, required: "required", description: "No punctuation." },
  { key: "middleName", label: "Middle Name", order: 2, required: "optional", description: "No punctuation." },
  { key: "lastName", label: "Last Name", order: 3, required: "required", description: "No punctuation. Suffixes (Jr, Sr, III) live here." },
  { key: "birthDate", label: "Birth Date (mm/dd/yyyy)", order: 4, required: "required", format: "MM/DD/YYYY", description: "Employee birth date." },
  { key: "sex", label: "Sex (M or F)", order: 5, required: "required", allowedValues: ["M", "F"], description: "M = Male, F = Female." },
  { key: "maritalStatus", label: "Marital Status (M or S)", order: 6, required: "required", allowedValues: ["M", "S"], description: "M = Married, S = Single." },
  { key: "ssn", label: "SSN (xxx-xx-xxxx)", order: 7, required: "required", format: "XXX-XX-XXXX", description: "Social Security Number." },
  { key: "division", label: "Division", order: 8, required: "required", description: "Per-company code, max 3 alpha/numeric." },
  { key: "businessUnit", label: "Business Unit", order: 9, required: "required", description: "Per-company code, max 5 alpha/numeric." },
  { key: "department", label: "Department", order: 10, required: "required", description: "Per-company code, max 5 alpha/numeric." },
  { key: "location", label: "Location", order: 11, required: "required", description: "Per-company code, max 5 alpha/numeric." },
  { key: "streetAddress1", label: "Street Address 1", order: 12, required: "required", description: "No punctuation." },
  { key: "streetAddress2", label: "Street Address 2", order: 13, required: "optional", description: "No punctuation." },
  { key: "city", label: "City", order: 14, required: "required", description: "No punctuation." },
  { key: "state", label: "State", order: 15, required: "required", allowedValues: US_STATE_CODES, description: "2-letter US state code." },
  { key: "zipCode", label: "Zip Code", order: 16, required: "required", format: "XXXXX or XXXXX-XXXX", description: "5-digit or 9-digit ZIP." },
  { key: "areaCode", label: "Area Code", order: 17, required: "optional", format: "XXX", description: "Home phone area code." },
  { key: "phoneNumber", label: "Phone Number (xxx-xxxx)", order: 18, required: "optional", format: "XXX-XXXX", description: "Home phone." },
  { key: "hireDate", label: "Hire Date (mm/dd/yyyy)", order: 19, required: "required", format: "MM/DD/YYYY", description: "Employee hire date." },
  { key: "stateWithholding", label: "State Withholding", order: 20, required: "required", allowedValues: US_STATE_CODES, description: "State for income tax withholding." },
  { key: "stateUnemployment", label: "State Unemployment", order: 21, required: "required", allowedValues: US_STATE_CODES, description: "State for unemployment insurance." },
  { key: "employeeStatus", label: "Employee Status Code (RFT or RPT)", order: 22, required: "required", allowedValues: ["RFT", "RPT"], description: "RFT = Regular Full Time, RPT = Regular Part Time." },
  { key: "jobCode", label: "Job Code", order: 23, required: "required", description: "Per-company code." },
  { key: "payrollGroupCode", label: "Payroll Group Code", order: 24, required: "required", description: "Per-company Payroll Group assigned by Netchex." },
  { key: "rateAmount", label: "Hourly Rate/Annual Salary Amount", order: 25, required: "required", description: "Hourly rate or annual salary; no $ or commas." },
  { key: "federalMaritalStatus", label: "Federal Marital Status", order: 26, required: "required", allowedValues: ["M", "S"], description: "Federal W-4 filing status: M or S." },
  { key: "federalExemptions", label: "Federal Exemptions", order: 27, required: "required", description: "Number of federal exemptions, no punctuation." },
  { key: "stateMaritalStatus", label: "State Marital Status", order: 28, required: "required", allowedValues: ["M", "S"], description: "State W-4 filing status: M or S." },
  { key: "stateExemptions", label: "State Exemptions", order: 29, required: "required", description: "Number of state exemptions, no punctuation." },
  { key: "stateSpecialExemptions", label: "State Special Exemptions", order: 30, required: "optional", description: "Louisiana special exemptions." },
  { key: "priLocalMaritalStatus", label: "Pri Local Marital Status", order: 31, required: "optional", allowedValues: ["M", "S"], description: "Primary local marital status." },
  { key: "priLocalExemptions", label: "Pri Local Exemptions", order: 32, required: "optional", description: "Primary local exemptions." },
  { key: "secLocalMaritalStatus", label: "Sec Local Marital Status", order: 33, required: "optional", allowedValues: ["M", "S"], description: "Secondary local marital status." },
  { key: "secLocalExemptions", label: "Sec Local Exemptions", order: 34, required: "optional", description: "Secondary local exemptions." },
  { key: "classification", label: "Employee Classification (W2, TIP, 1099)", order: 35, required: "required", allowedValues: ["W2", "1099", "TIP"], description: "W2, 1099, or TIP (tipped)." },
  { key: "position", label: "Position", order: 36, required: "optional", description: "Per-company position name, no punctuation." },
  { key: "termDate", label: "Term Date", order: 37, required: "optional", format: "MM/DD/YYYY", description: "Termination date." },
  { key: "extraFedDollars", label: "Extra Fed $", order: 38, required: "optional", description: "Extra federal tax $ amount." },
  { key: "extraStateDollars", label: "Extra State $", order: 39, required: "optional", description: "Extra state tax $ amount." },
  { key: "payrollSchedule", label: "Payroll Schedule", order: 40, required: "conditional", conditionalRule: "Required if company has more than one payroll schedule.", description: "Payroll schedule name." },
  { key: "stateMinWage", label: "State Min Wage", order: 41, required: "conditional", conditionalRule: "Required only when Classification = TIP.", allowedValues: US_STATE_CODES, description: "Tipped-employee state min wage." },
  { key: "cityMinWage", label: "City Min  Wage", order: 42, required: "optional", description: "Per-company city min wage setup." },
  { key: "personalEmail", label: "Personal Email Address", order: 43, required: "conditional", conditionalRule: "Required when Primary Contact Method = E.", description: "Personal email address." },
  { key: "cellPhoneAreaCode", label: "Cell Phone Area Code", order: 44, required: "conditional", conditionalRule: "Required when Primary Contact Method = P.", format: "XXX", description: "Cell phone area code." },
  { key: "cellPhoneNumber", label: "Cell Phone Number", order: 45, required: "conditional", conditionalRule: "Required when Primary Contact Method = P.", format: "XXX-XXXX", description: "Cell phone number." },
  { key: "primaryContactMethod", label: "Primary Contact Method", order: 46, required: "optional", allowedValues: ["E", "P"], description: "E = email, P = phone." },
  { key: "__spacer", label: "", order: 47, required: "optional", description: "Reserved blank column per Netchex template.", isSpacer: true },
  { key: "race", label: "Race", order: 48, required: "optional", allowedValues: [
    "Asian",
    "Black or African American",
    "Hispanic or Latino",
    "American Indian or Alaska Native",
    "None Specified",
    "Two or More Races",
    "Native Hawaiian or Other Pacific Islander",
    "White",
  ], description: "EEO race category." },
  { key: "eeoClass", label: "EEOCLASS", order: 49, required: "optional", allowedValues: [
    "Administrative Support Workers",
    "Craft Workers",
    "Executive/Senior Level Officials and Managers",
    "Laborers and Helpers",
    "None Specified",
    "Operatives",
    "Professionals",
    "Sales Workers",
    "Service Workers",
    "Technicians",
  ], description: "EEO-1 job classification." },
  { key: "ddOrder", label: "Order", order: 50, required: "conditional", conditionalRule: "Required when adding direct deposit; must be \"1\".", allowedValues: ["1"], description: "Direct deposit order." },
  { key: "ddRoutingNumber", label: "Routing Number", order: 51, required: "conditional", conditionalRule: "Required when adding direct deposit.", description: "Bank routing number." },
  { key: "ddAccountNumber", label: "Account Number", order: 52, required: "conditional", conditionalRule: "Required when adding direct deposit.", description: "Bank account number." },
  // Netchex template ships this header with a trailing tab character; preserve verbatim.
  { key: "ddAccountType", label: "Account Type\t", order: 53, required: "conditional", conditionalRule: "Required when adding direct deposit.", allowedValues: ["Checking", "Savings"], description: "Direct deposit account type." },
  { key: "ddEffectiveDate", label: "Effective Date", order: 54, required: "conditional", conditionalRule: "Required when adding direct deposit.", format: "MM/DD/YYYY", description: "Direct deposit effective date." },
  { key: "ddStatus", label: "Status", order: 55, required: "conditional", conditionalRule: "Required when adding direct deposit.", allowedValues: ["Deposit", "Prenote"], description: "Direct deposit status." },
  { key: "ddDepositAmount", label: "Deposit amount", order: 56, required: "conditional", conditionalRule: "Required when adding direct deposit.", allowedValues: ["Balance", "Partial"], description: "Balance or Partial." },
  { key: "ddPartialAmount", label: "Partial Amount", order: 57, required: "conditional", conditionalRule: "Required when Deposit amount = Partial.", description: "Partial deposit amount value." },
  { key: "ddPartialAmountType", label: "Partial Amount Type", order: 58, required: "conditional", conditionalRule: "Required when Deposit amount = Partial.", allowedValues: ["Full Dollar", "Percentage"], description: "Full Dollar or Percentage." },
  { key: "form2020W4", label: "2020 Form W-4", order: 59, required: "optional", allowedValues: YN, description: "Y if on the 2020+ W-4 form." },
  { key: "fedMultipleJob", label: "Fed Multiple Job", order: 60, required: "optional", allowedValues: YN, description: "Federal multiple-jobs flag." },
  { key: "fedDependentCredit", label: "Fed Dependent Credit", order: 61, required: "optional", description: "Federal dependent credit $ amount." },
  { key: "fedOtherIncome", label: "Fed Other Income", order: 62, required: "optional", description: "Federal other-income $ amount." },
  { key: "fedDeductions", label: "Fed Deductions", order: 63, required: "optional", description: "Federal deductions $ amount." },
  { key: "stateMultipleJob", label: "State Multiple Job", order: 64, required: "optional", allowedValues: YN, description: "State multiple-jobs flag." },
  { key: "stateDependentCredit", label: "State Dependent Credit", order: 65, required: "optional", description: "State dependent credit $ amount." },
  { key: "stateOtherIncome", label: "State Other Income", order: 66, required: "optional", description: "State other-income $ amount." },
  { key: "stateDeductions", label: "State Deductions", order: 67, required: "optional", description: "State deductions $ amount." },
];

export const NETCHEX_FIELD_KEYS = NETCHEX_FIELDS.map((f) => f.key);
export type NetchexFieldKey = (typeof NETCHEX_FIELDS)[number]["key"];

export const NETCHEX_FIELDS_BY_KEY: Record<string, NetchexField> =
  Object.fromEntries(NETCHEX_FIELDS.map((f) => [f.key, f]));
