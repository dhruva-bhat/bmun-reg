# bmun-reg

Registration automation for BMUN on Google Sheets + Apps Script. One set of master tables with stable IDs;
rosters, counts and waiver flags are derived from them. See the plan for the reasoning.

## Layout

| Path | What |
| --- | --- |
| `src/Normalize.js`, `Ids.js`, `Csv.js` | Name normalization, ID generation, CSV |
| `src/Schools.js` | Canonical names and aliases; unknown names are flagged, never auto-created |
| `src/Counts.js` | Per-school totals derived from Delegate rows; registered cap only goes down |
| `src/Waivers.js` | Ingest form responses, exact auto-match, near-match review queue, manual confirm |
| `src/Assign.js` | Seeded room assignment: sizes within one, school spread, locks, incremental placement |
| `src/Changes.js` | Day-of actions (drop, late add, fix name, change workshop, paper waiver, check in) with change log |
| `src/Import.js` | Idempotent registration import (Aldous CSV or form rows) with a column map |
| `src/Views.js`, `CheckIn.js` | Derived tabs and the check-in page payloads (no DOB, phone or insurance) |
| `src/Schema.js`, `Store.js`, `Pipeline.js`, `Code.js` | Sheet tables, Config tab, locked idempotent runs, menu and triggers |
| `src/WebApp.js`, `Desk.html` | Staff-only front desk page |

Pure modules have no Apps Script dependency and are covered by `npm test`.

## Setup

1. Create a Google Sheet, then Extensions → Apps Script, or use [clasp](https://github.com/google/clasp):
   `clasp create --type sheets --rootDir src` then `clasp push`.
2. Reload the sheet, then **BMUN Registration → Set up sheets**. Fill the **Config** tab: `staff_emails`
   (only these accounts can open the check-in page), the registration and waiver tab names, and the column map.
3. Paste the registration CSV into the registration tab. Add `School` rows with aliases if you have them, then
   **Import registration (first load)**; later imports flag unknown school names instead of creating them.
4. **Install triggers** (form submit, review-queue tick, 5-minute safety net).
5. **Match waivers**, work the **Review Queue** (tick a box to confirm), then **Place unassigned delegates**.
6. Deploy → New deployment → Web app (execute as the user accessing, domain access) for the check-in page.

## Notes

- Raw form responses are never edited; corrections happen in the master tables and are logged.
- Staff should edit only input columns. Protect calculated tabs (School Summary, Room Rosters, Review Queue
  checkbox column aside) and restrict the Waiver tab: it holds dates of birth.
- Rebuild rosters can move people who are not locked (set `locked` to TRUE on the Delegate row). Press it only before printing.
- Refunds and the school dashboard are out of scope; the Payment table is created for later.

## Tests

```
npm test
```
