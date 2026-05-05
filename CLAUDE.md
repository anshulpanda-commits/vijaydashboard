# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

Deploy by pushing to `main` — Vercel auto-deploys. From the worktree branch always use:
```bash
git push origin HEAD:main
```

## Architecture

Data flows in one direction: **Google Sheet → CSV → parser → API → client component → charts + table**.

### Data pipeline

**`lib/sheets.ts`** fetches the sheet as CSV (`cache: "no-store"`) and parses it into `SalesData`. The parser is fully dynamic — it reads column headers directly from the sheet so adding a column to the sheet requires no code changes.

Sheet layout (GID `1589162378` of sheet `1QF7DvG8UISXlMpHeFapjpe-niy1akY-8IGzD6ehnHQA`):
- Row 0: export date
- Row 1: date headers — non-empty cells from col 2 onwards each start a day block (e.g. `"May 1"`, `"May 2"`)
- Row 2: column headers — within each day block, columns up to (not including) `"MTD"` are metric columns; `"MTD"` is the accumulated revenue column
- Row 3: empty
- Row 4+: store rows — col 0 = store name, col 1 = MTD units, then day blocks
- `"Total"` row marks end of data

Each day block is **[metric cols…, MTD_revenue]**. Block width is determined dynamically by scanning row 2 for the `"MTD"` header. `columnHeaders` in `SalesData` holds the discovered metric names (e.g. `["Brisk", "Halov2", "Stromgo", "Renpro", "Rengo"]`).

**`app/api/sales/route.ts`** — thin wrapper around `fetchSalesData()`, `revalidate = 0` (always fresh).

**`components/Dashboard.tsx`** — single `"use client"` component that owns everything: fetches `/api/sales` on mount, renders all charts and the live data table, handles dark/light mode and the Set Targets modal. It uses `columnHeaders` from the API response to drive all charts and the table dynamically — no hardcoded product names.

### Key types (`lib/types.ts`)

```ts
DayData     { date, metrics: Record<string, number>, total, mtdRevenue }
StoreData   { name, shortName, days: DayData[], totalQty, mtdRevenue }
SalesData   { columnHeaders, stores, grandTotalUnits, grandTotalRevenue, … }
```

`columnColor(header, index)` maps known product names to fixed colours; unknown columns get palette colours — supports new metrics without code changes.

### Dark mode

Tailwind `darkMode: "class"` — the `dark` class is toggled on `<html>` by the Dashboard component. `app/layout.tsx` has `suppressHydrationWarning` on `<html>` to prevent SSR mismatch.

### Persistence (client-side only)

- `vjd_targets` — per-store monthly unit targets (localStorage)
- `vjd_theme` — `"dark"` or `"light"` (localStorage)
