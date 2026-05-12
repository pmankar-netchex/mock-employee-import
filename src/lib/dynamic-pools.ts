// Netchex-managed code pools. Each pool represents a per-company lookup table
// that lives inside Netchex (e.g. Payroll Group Codes set up during company
// onboarding). Fields in netchex-spec.ts can reference one or more pools via
// `dynamicPools`; the column-mapping UI then offers "Dynamic value" mode that
// picks from the pool instead of free-text constants.
//
// Values here are dummy data for the mock — in a real integration they'd be
// fetched from the Netchex API at session start.

export type DynamicPoolOption = {
  code: string;
  label?: string; // display label; falls back to code
  description?: string; // tooltip / secondary text
};

export type DynamicPool = {
  id: string;
  label: string;
  description?: string;
  options: DynamicPoolOption[];
};

export const DYNAMIC_POOLS: readonly DynamicPool[] = [
  {
    id: "payroll-group-codes",
    label: "Payroll Group Codes",
    description: "Per-company payroll groups configured in Netchex.",
    options: [
      { code: "BiWklyHrly", label: "Bi-Weekly Hourly" },
      { code: "BiWklyXmpt", label: "Bi-Weekly Exempt" },
      { code: "WeeklyHrly", label: "Weekly Hourly" },
      { code: "WeeklyXmpt", label: "Weekly Exempt" },
      { code: "SemiMonHrly", label: "Semi-Monthly Hourly" },
      { code: "SemiMonXmpt", label: "Semi-Monthly Exempt" },
      { code: "MonthlyXmpt", label: "Monthly Exempt" },
    ],
  },
  {
    id: "workers-comp-codes",
    label: "Workers Comp Codes",
    description: "NCCI workers' compensation classification codes.",
    options: [
      { code: "8810", label: "8810 — Clerical office employees" },
      { code: "8742", label: "8742 — Outside sales" },
      { code: "8868", label: "8868 — College — professional employees" },
      { code: "9015", label: "9015 — Building operation" },
      { code: "5606", label: "5606 — Project manager / supervisor (construction)" },
      { code: "5645", label: "5645 — Carpentry (residential)" },
      { code: "7600", label: "7600 — Telecommunications field crew" },
    ],
  },
];

export const DYNAMIC_POOLS_BY_ID: Record<string, DynamicPool> = Object.fromEntries(
  DYNAMIC_POOLS.map((p) => [p.id, p]),
);

export function getPool(id: string): DynamicPool | undefined {
  return DYNAMIC_POOLS_BY_ID[id];
}

export function getPoolOption(
  poolId: string,
  code: string,
): DynamicPoolOption | undefined {
  return getPool(poolId)?.options.find((o) => o.code === code);
}
