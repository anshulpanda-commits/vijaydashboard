import { SKU, SalesData, StoreData, DayUnits } from "./types";

const SHEET_ID = process.env.SHEET_ID || "1QF7DvG8UISXlMpHeFapjpe-niy1akY-8IGzD6ehnHQA";
const SHEET_GID = process.env.SHEET_GID || "1589162378";

// ─── Sheet structure ──────────────────────────────────────────────────────────
//
// Row 0: Export date  e.g. "5/5/2026,,,,..."
// Row 1: Date headers e.g. ",,May 1,,,,,,May 2,,,,,,May 3,..."
//        Date label appears at col 2, then every 6 cols (5 SKUs + 1 MTD col)
// Row 2: Column hdrs  "Daily Sales","MTD Units","Brisk","Halov2","Stromgo","Renpro","Rengo","MTD",...
// Row 3: Empty
// Row 4+: Store rows  col 0 = store name, col 1 = MTD units, then day blocks
// "Total" row marks end of data
//
// Each day block is 6 columns wide: [SKU1, SKU2, SKU3, SKU4, SKU5, MTD_Revenue]
// The MTD_Revenue column accumulates: last non-zero value = current MTD revenue.
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
    let inQuote = false;
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    rows.push(cells);
  }
  return rows;
}

function detectSku(header: string): SKU | null {
  const h = header.toLowerCase().trim();
  if (h === "brisk") return "brisk";
  if (h.startsWith("renp") || h === "ren pro") return "renpro";
  if (h.includes("strom")) return "stromgo";
  if (h.includes("halo")) return "halov2";
  if (h.startsWith("reng") || h === "ren go") return "rengo";
  return null;
}

function parseSalesData(rows: string[][]): SalesData {
  // Row 0: export date — extract year
  const exportDateStr = (rows[0]?.[0] ?? "").trim();
  const yearMatch = exportDateStr.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

  const dateHeaderRow = rows[1] ?? [];
  const colHeaderRow  = rows[2] ?? [];

  // Discover day blocks: non-empty cells in date header row from col 2 onwards.
  // Each block is 6 cols wide: 5 SKUs starting at startCol, MTD at startCol+5.
  const dayBlocks: Array<{ date: string; startCol: number; mtdCol: number }> = [];
  for (let c = 2; c < dateHeaderRow.length; c++) {
    const cell = (dateHeaderRow[c] ?? "").trim();
    if (cell) dayBlocks.push({ date: cell, startCol: c, mtdCol: c + 5 });
  }

  // Extract month name from first date (e.g. "May 1" → "May")
  const firstDate = dayBlocks[0]?.date ?? "";
  const monthName = (firstDate.match(/^([A-Za-z]+)/) ?? [])[1] ?? "";
  const month = monthName ? `${monthName} ${year}` : "";
  const title = month ? `${month} Sales — Vijay Sales` : "Sales Dashboard";

  // Detect SKU order from column header row (first 5 SKU-like headers from col 2)
  const skuOrder: SKU[] = [];
  for (let c = 2; c < colHeaderRow.length && skuOrder.length < 5; c++) {
    const sku = detectSku(colHeaderRow[c] ?? "");
    if (sku && !skuOrder.includes(sku)) skuOrder.push(sku);
  }
  const finalSkuOrder: SKU[] = skuOrder.length === 5
    ? skuOrder
    : ["brisk", "halov2", "stromgo", "renpro", "rengo"];

  // Parse store rows starting at row 4 (index 3)
  const stores: StoreData[] = [];
  let grandTotalUnits = 0;

  for (let r = 3; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[0] ?? "").trim();
    if (!name) continue;
    if (/^total/i.test(name)) {
      grandTotalUnits = num(row[1]);
      break;
    }

    const totalQty = num(row[1]); // col B = MTD units

    const days: DayUnits[] = dayBlocks.map(({ date, startCol, mtdCol }) => {
      const d: DayUnits = { date, brisk: 0, renpro: 0, stromgo: 0, halov2: 0, rengo: 0, total: 0, mtdRevenue: 0 };
      let total = 0;
      finalSkuOrder.forEach((sku, i) => {
        const v = num(row[startCol + i]);
        d[sku] = v;
        total += v;
      });
      d.total = total;
      d.mtdRevenue = num(row[mtdCol]);
      return d;
    });

    // Use the last non-zero MTD revenue as the store's current MTD revenue
    const mtdRevenue = [...days].reverse().find(d => d.mtdRevenue > 0)?.mtdRevenue ?? 0;

    stores.push({ name, shortName: storeShortName(name), days, totalQty, mtdRevenue });
  }

  const grandTotalRevenue = stores.reduce((s, store) => s + store.mtdRevenue, 0);

  return {
    title,
    month,
    stores,
    grandTotalUnits,
    grandTotalRevenue,
    lastUpdated: new Date().toISOString(),
  };
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

  const text = await res.text();
  return parseSalesData(parseCSV(text));
}
