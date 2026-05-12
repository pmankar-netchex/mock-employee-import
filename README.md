# Netchex New Hire Import (mock)

Converts a client's raw employee spreadsheet (xlsx, xls, or csv) into the 68-column Netchex new-hire import CSV, with column mapping and value translation along the way.

## Quickstart

```
git clone <repo>
cd mock-employee-import
npm install
npm run dev
```

Open <http://localhost:3000>. The app walks through four steps: Upload → Columns → Values → Preview, then downloads the import CSV.

## Modules

- `src/lib/netchex-spec.ts` — the 68-field Netchex import spec (labels, order, required/conditional, allowed-value enums, format hints). Single source of truth.
- `src/lib/parse-excel.ts` / `parse-csv.ts` — server-side file parsing; auto-detects the Data sheet and header row for multi-sheet xlsx.
- `src/lib/suggest-mapping.ts` — fuzzy + alias matching from client column headers to Netchex fields.
- `src/lib/value-synonyms.ts` / `state-abbreviations.ts` — built-in synonym maps for Sex, Marital, State, Status, Classification, Contact Method, Y/N, etc.
- `src/lib/distinct-values.ts` — scans rows for distinct values of a mapped source column (drives the Values step).
- `src/lib/transform.ts` — pure function: rows × column mapping × value mapping → records + validation issues. Handles date/SSN/zip/phone formatting, full-name splitting, conditional-required validation.
- `src/lib/csv-export.ts` — serializes records to the Netchex 68-column CSV.
- `src/context/WorkflowContext.tsx` — client-side workflow state (parsed file, column mapping, value mapping). No persistence between sessions.
- `src/components/{Stepper,ColumnMapRow,Combobox,EmptyState,PreviewTable}.tsx` — UI primitives for each step.
- `src/app/(steps)/{upload,columns,values,preview}/page.tsx` — the four step pages.
- `src/app/api/parse/route.ts` — multipart upload endpoint that delegates to the parsers.

## Configuration

| Variable | Purpose |
|---|---|
| `PAGES_BASE_PATH` | Build-time prefix (e.g. `/mock-employee-import`) when serving from a GitHub Pages project site. Unset for local dev. |

No runtime services — parsing runs entirely in the browser; no database, no auth, no external APIs.

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds a static export and deploys to GitHub Pages on every push to `main`. After the first run:

1. Open the repo's **Settings → Pages**, set Source to **GitHub Actions** (one-time).
2. Subsequent pushes trigger a build and update the published site.

The `PAGES_BASE_PATH` env var in the workflow must match the repo name (it's the path GH Pages serves the site under).

## Updating the Netchex field spec

When Netchex changes the import format, edit `src/lib/netchex-spec.ts`:

1. Add or remove entries in `NETCHEX_FIELDS` — order must match the export column order exactly.
2. To preserve a blank column at a given position (like the existing index-47 spacer), set `isSpacer: true` and `label: ""`.
3. To add an enum-constrained field, set `allowedValues: [...]`. The Values step will auto-render a dropdown.
4. To add a new built-in synonym for an enum field, edit `src/lib/value-synonyms.ts` `RESOLVERS`.
5. Update `groupForOrder` in `netchex-spec.ts` if the new field falls outside the existing group ranges.
6. Run `npm test` — the Poythress golden-file test will catch most accidental shape changes.

## Testing

```
npm test
```

Vitest suites in `src/lib/__tests__/`: formatters, end-to-end transform against the Poythress fixture, value-mapping synonyms, name splitting, and conditional validation.
