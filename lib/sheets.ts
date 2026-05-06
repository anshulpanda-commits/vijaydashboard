import { SalesData, StoreData, DayData, getStoreCode } from "./types";

const SHEET_ID = process.env.SHEET_ID || "1QF7DvG8UISXlMpHeFapjpe-niy1akY-8IGzD6ehnHQA";
const SHEET_GID = process.env.SHEET_GID || "1589162378";

// ─── Sheet structure ──────────────────────────────────────────────────────────
//
// Row 0: Export date  e.g. "5/5/2026"
// Row 1: Date headers e.g. "  , , May 1, , , , , , May 2, , …"
//        A non-empty cell marks the start of a new day block.
// Row 2: Column hdrs  e.g. "Daily Sales, MTD Units, Brisk, Halov2, …, MTD, Brisk, …"
//        Within each day block: data columns, then one "MTD" revenue column.
// Row 3: Empty
// Row 4+: Store rows  col 0 = name, col 1 = MTD units, then day blocks
// "Total" row marks end of data.
//
// This parser is FULLY DYNAMIC:
//   • Any number of days is supported.
//   • Any columns between the date and the MTD column are captured automatically.
//   • Adding a new column to the sheet (e.g. "Footfall") requires zero code changes.
// ─────────────────────────────────────────────────────────────────────────────

function num(v: string | undefined): number {
  if (!v || !v.trim()) return 0;
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

function storeShortName(name: string): string {
  return name.split(/\s*[-–]\s*/)[0].trim();
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")) {
    const cells: string[] = [];
    let inQuote = false, cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function parseSalesData(rows: string[][]): SalesData {
  const exportDateStr = (rows[0]?.[0] ?? "").trim();
  const yearMatch = exportDateStr.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());

  const dateHeaderRow = rows[1] ?? [];
  const colHeaderRow  = rows[2] ?? [];

  // ── Detect day blocks ────────────────────────────────────────────────────────
  // Each non-empty cell in the date header row (from col 2 onwards) starts a block.
  // Within the block, scan col headers until we hit "MTD" → that's the revenue col.
  const datePositions: number[] = [];
  for (let c = 2; c < dateHeaderRow.length; c++) {
    if ((dateHeaderRow[c] ?? "").trim()) datePositions.push(c);
  }

  const dayBlocks: Array<{
    date: string;
    dataColumns: Array<{ header: string; col: number }>;
    mtdCol: number;
  }> = [];

  for (let bi = 0; bi < datePositions.length; bi++) {
    const startCol = datePositions[bi];
    const nextBlockStart = datePositions[bi + 1] ?? colHeaderRow.length;
    const date = (dateHeaderRow[startCol] ?? "").trim();

    const dataColumns: Array<{ header: string; col: number }> = [];
    let mtdCol = nextBlockStart - 1; // fallback: last col of block

    for (let c = startCol; c < nextBlockStart; c++) {
      const h = (colHeaderRow[c] ?? "").trim();
      if (!h) continue;
      if (h.toLowerCase() === "mtd") { mtdCol = c; break; }
      dataColumns.push({ header: h, col: c });
    }

    if (date) dayBlocks.push({ date, dataColumns, mtdCol });
  }

  // ── Column headers (from first block — all blocks have the same structure) ──
  const columnHeaders: string[] = dayBlocks[0]?.dataColumns.map(dc => dc.header) ?? [];

  // ── Month / title ────────────────────────────────────────────────────────────
  const firstDate = dayBlocks[0]?.date ?? "";
  const monthName = (firstDate.match(/^([A-Za-z]+)/) ?? [])[1] ?? "";
  const month = monthName ? `${monthName} ${year}` : "";
  const title  = month ? `${month} Sales — Vijay Sales` : "Sales Dashboard";

  // ── Parse store rows ─────────────────────────────────────────────────────────
  const stores: StoreData[] = [];
  let grandTotalUnits = 0;

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[0] ?? "").trim();
    if (!name) continue;
    if (/^total/i.test(name)) { grandTotalUnits = num(row[1]); break; }

    const totalQty = num(row[1]);

    const days: DayData[] = dayBlocks.map(({ date, dataColumns, mtdCol }) => {
      const metrics: Record<string, number> = {};
      let total = 0;
      for (const { header, col } of dataColumns) {
        const v = num(row[col]);
        metrics[header] = v;
        total += v;
      }
      return { date, metrics, total, mtdRevenue: num(row[mtdCol]) };
    });

    const mtdRevenue = [...days].reverse().find(d => d.mtdRevenue > 0)?.mtdRevenue ?? 0;

    stores.push({ name, shortName: storeShortName(name), storeCode: getStoreCode(name), days, totalQty, mtdRevenue });
  }

  const grandTotalRevenue = stores.reduce((s, st) => s + st.mtdRevenue, 0);

  return { title, month, columnHeaders, stores, grandTotalUnits, grandTotalRevenue, lastUpdated: new Date().toISOString() };
}

export async function fetchSalesData(): Promise<SalesData> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Sheet fetch failed (HTTP ${res.status}). ` +
      `Make sure the sheet is shared as "Anyone with the link — Viewer".`
    );
  }
  return parseSalesData(parseCSV(await res.text()));
}
