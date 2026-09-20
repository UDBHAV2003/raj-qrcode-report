# Sanjay Pathology & Diagnostic Centre — Laboratory Information System

A fully functional, frontend-only (no backend) React + Vite app:

1. **Login** — fixed credentials, no server needed
2. **Dashboard** — stats + patient list
3. **New Patient Entry** — patient details + full diagnostic test catalog,
   grouped by category, with **individual-parameter ordering** (e.g. a
   patient can order just SGOT/SGPT instead of the whole LFT panel)
4. **Fill Test Results** — enter values for every parameter that was
   actually ordered for that patient
5. **Report** — a clean, patient-info-first PDF report generated in-browser
   with `@react-pdf/renderer@4.5.1` — live preview, a font-style picker,
   a **Print** button, and a **Download PDF** button

All data (patients, results) is saved to the browser's `localStorage`, so it
persists across refreshes — no database or API required.

## Login credentials

```
Username: admin
Password: sanjay@123
```

Change these in `src/context/AuthContext.jsx` (`FIXED_USERNAME` / `FIXED_PASSWORD`).

## Setup

This project needs `npm install` to pull dependencies (React, React Router,
`@react-pdf/renderer`) — that step requires internet access, which wasn't
available in the sandbox this was built in, so run these on your own machine:

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

To create a production build:

```bash
npm run build
npm run preview
```

## Latest revision — what changed

- **Fixed the page-overlap bug**: the patient-info header is reserved via the
  **Page's own top padding** (not a child element's margin), so if a
  report's tests spill onto a 2nd/3rd page, the same top/bottom margins
  apply on every page and nothing ever overlaps the repeating header.
- **Patient info is clearer**: Patient Name is now shown as a large, bold
  title (so it's obvious whose report it is) with a "FINAL REPORT" /
  "PROVISIONAL" status badge next to it. Age and Gender are separate
  rows (previously combined). Sample Collection Date is now formatted
  the same way as Report Date (e.g. "14 Jul 2026").
- **"DIAGNOSTIC LABORATORY REPORT" banner** sits between the patient-info
  block and the test tables (repeats on every page along with the info
  block).
- **Auto-calculated parameters**: CBC's MCV/MCH/MCHC (from Hb, RBC,
  HCT), Lipid Profile's LDL/VLDL (Friedewald formula) + TC/HDL and
  LDL/HDL ratios, and LFT's Globulin/A-G Ratio are now computed live on
  the results page from the measured values — shown as read-only "Auto"
  fields, and marked with a `†` + legend on the PDF.
- **Serology date fields**: Typhoid (Widal), the Vector Borne/Respiratory
  panel (Dengue, Chikungunya, Malaria, Filaria, Montoux, AFB), Hepatitis
  & Retroviral Status (HIV, HCV, HBsAg, VDRL), Arthritis Profile (incl.
  RA Factor) and Antenatal/Special Markers now capture a **Date of
  Testing** and **Date of Reading**, printed on the report next to that
  test's table.
- **General Remarks/Comments**: an optional field on the results page,
  printed on the report just before "End of Report".
- **Black & white print friendly**: abnormal results get light grey row
  shading in addition to bold red text and an H/L/`*` marker, so they
  stay visually distinct even when printed without colour.
- **"Computerized Report" note** added under "END OF REPORT", signature
  block left exactly as it was.
- **Search box on Patient Entry**: search the whole catalog (test names
  or individual parameter names, e.g. "SGOT") to instantly filter/jump to
  the right test and auto-expand its individual-parameter picker.
- **Dashboard**: patient rows now show an initials avatar, a dedicated
  "Referred By" column with a doctor filter dropdown above the table,
  and test tags are truncated with a "+N more" badge (hover for the full
  name) so long test lists don't blow out the row.

> Note: the handwritten note also mentioned "commission" next to the
> referred-doctor list — there's no commission/percentage data anywhere
> in the app yet, so that part wasn't implemented (only the doctor filter
> was). Let me know if you want a commission-per-doctor field added and
> what the commission structure should look like.

## Latest revision (this one) — what changed

- **Report PDF redesign**: switched to a minimalist black/white "premium"
  theme (matches the file you shared) — two-column patient info card with
  `LABEL : VALUE` styling, a **"DIAGNOSTIC LABORATORY REPORT" banner**
  printed right after the patient info, and vertical divider lines on the
  result table for a cleaner "chart" look. No signature block / disclaimer
  footer (removed, as requested) — the report still ends with
  `--- END OF REPORT ---`.
- **Result text size control**: a new "Result text size" dropdown next to
  the font picker (Compact / Normal / Large) so you can bump up the
  RESULT column's text size yourself, same idea as the font selector.
- **Fixed a real bug** in the file you pasted: `patient.age.toUpperCase()`
  would crash, since age is a number — removed.
- **Kept the results data structure** (`results[testId].params[key]`,
  `.testingDate`, `.readingDate`) instead of the flatter one in the
  pasted file, so **serology Date of Testing/Reading and the
  auto-calculated CBC/Lipid/LFT fields keep working** — the pasted
  version's flat access (`results[testId][key]`) would otherwise have
  silently shown "—" for every result.
- **Widal restructured** to match your screenshot: `S. Typhi "O" (TO)`,
  `S. Typhi "H" (TH)`, `S. Paratyphi "AH"`, `S. Paratyphi "BH"` — each
  takes a titer value like `1:120` or `0`.
- **Malaria Parasite (MP) restructured** to match your screenshot: `MP
  Antigen`, `Plasmodium vivax (P. vivax)`, `Plasmodium falciparum (P.
  falciparum)`.
- **HBsAg** reference changed to `Non Reactive` (matches your screenshot)
  instead of `Negative`.
- **Method/assay description line** added under the parameter name for
  the major qualitative tests (HIV, HCV, HBsAg, VDRL, Dengue, Chikungunya,
  Filaria, RA Factor, ASO, CRP, Pregnancy) — e.g. "Rapid test for
  qualitative detection of antibodies to HIV-1 & HIV-2."
- **General comment per test**: every test now has a one-line note
  printed under its table (pre-analytical caveat / interpretive note) —
  wording is my best judgement per test, happy to adjust any of them.
- **Black & white print friendly**: abnormal rows get light grey shading
  in addition to bold red text, so they still stand out without colour.
- **Dashboard**: the doctor-referral filter dropdown is gone — replaced
  with a **date filter** (pick a date, see how many patients were
  registered that day, with a chip to clear it) plus a **search box**
  (patient or doctor name). Test tags now show **short forms** (CBC, MP,
  Widal, HIV/HBsAg/HCV, ...) instead of the full test name; a partial
  selection shows e.g. `LFT (2)`.
- **Dark / light mode**: a 🌙/☀️ toggle in the header, persisted across
  visits (`src/hooks/useTheme.js`).

## What changed in the revision before that

- Full test catalog matching the uploaded document (5 categories, all
  tests/parameters, gender-specific reference ranges).
- Individual parameter ordering (Full Panel vs. picking specific
  parameters, e.g. just SGOT/SGPT from LFT) with derived per-parameter
  pricing — see `individualParamPrice()` in `src/data/tests.js`.
- Removed Address & Contact Number from Patient Entry and the report.
- Report layout simplified: no lab logo/banner/tagline/NABL strip.
- Font style picker (Helvetica / Times / Courier) and a Print button.

## Setup

This project needs `npm install` to pull dependencies (React, React
Router, `@react-pdf/renderer`) — that step requires internet access,
which wasn't available in the sandbox this was built in, so run these on
your own machine:

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

To create a production build:

```bash
npm run build
npm run preview
```

## Login credentials

```
Username: admin
Password: sanjay@123
```

Change these in `src/context/AuthContext.jsx` (`FIXED_USERNAME` / `FIXED_PASSWORD`).

## Editing the report footer / pathologist details

Open `src/pages/Report.jsx` and edit the `REPORT_META` object
(pathologist name/qualification, disclaimer text).

## Editing the test catalog / calculated formulas

Open `src/data/tests.js`. Each category has `head`, `subHead`, and
`tests`; each test has a `key`, `label`, `price`, optional `serology:
true`, and `params` (each with `key`, `name`, `unit`, a `range` of
`{ A }` or `{ M, F }`, and an optional `calc(nums)` function for
auto-calculated values). Add/remove tests or parameters here — they
automatically flow through to the entry form, the results form, and the
PDF report.

## Project structure

```
src/
  context/
    AuthContext.jsx      fixed-credential login state
    PatientContext.jsx   patient records, persisted to localStorage
  components/
    Header.jsx            shared top bar
    ProtectedRoute.jsx     redirects to /login if not signed in
    ReportDocument.jsx     the @react-pdf/renderer PDF layout
  pages/
    Login.jsx
    Dashboard.jsx           doctor filter, avatar, truncated tags
    PatientEntry.jsx        category-grouped catalog, search box, full-panel + individual param picking
    TestResults.jsx         auto-calculated fields, serology dates, remarks
    Report.jsx              PDF preview, font picker, Print & Download
  data/
    tests.js                full test catalog + pricing + calc helpers
```

# update-raj2.0-version-lab
# demo-raj-barcode
# RAJ-2.0-VERSION-LAUNCH
# raj-qrcode-report
