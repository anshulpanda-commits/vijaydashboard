import { SKU, SalesData, StoreData, WeekSummary, WeekUnits } from "./types";

const SHEET_ID =
  process.env.SHEET_ID || "1QF7DvG8UISXlMpHeFapjpe-niy1akY-8IGzD6ehnHQA";
const SHEET_GID = process.env.SHEET_GID || "0";

// ─── Sheet structure (confirmed from CSV export) ───────────────────────────────
//
// Row 0: Title — "MAR 2025 Sales Summary: Vijay sales"
// Row 1: "Overall Sales"
// Row 2: Week headers — "Week 1(1st-8th Mar)" [col 1], "Week 2…" [col 6], …
//         "Total QTY" [col 21], "MTD" [col 22]
// Row 3: SKU sub-headers — Brisk, Renpro, Stromgo, Halov2, Rengo (×4 weeks)
// Row 4+: Store data rows (store name in col 0)
// "Total" row marks end of sales section
//
// MTD column is in Indian number format (e.g. ₹2,84,000) which CSV splits
// across multiple cells: ["2", "84", "000"]. We rejoin them by concatenation.
//
// After the sales section:
//   "Overall Walkin" section — SKU footfall per store
//   "Store Location" section — weekly unit + revenue totals
// ─────────────────────────────────────────────────────────────────────────────

function num(v: string | undefined): number {
  if (!v || !v.trim()) return 0;
  const n = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

// Indian comma format: ["2","84","000"] → 284000
function parseIndianNum(parts: string[]): number {
  const joined = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("");
  const n = parseInt(joined, 10);
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

// Discover SKU order from a header row starting at `startCol`
function skuOrderFromRow(row: string[], startCol: number): SKU[] {
  const order: SKU[] = [];
  for (let c = startCol; c < row.length && order.length < 5; c++) {
    const h = (row[c] || "").toLowerCase().trim();
    if (h === "brisk") order.push("brisk");
    else if (h.startsWith("renp")) order.push("renpro");
    else if (h.includes("strom")) order.push("stromgo");
    else if (h.includes("halo")) order.push("halov2");
    else if (h.startsWith("reng")) order.push("rengo");
  }
  return order.length > 0 ? order : ["brisk", "renpro", "stromgo", "halov2", "rengo"];
}

function parseSalesData(rows: string[][]): SalesData {
  // ── Title & month ──────────────────────────────────────────────────────────
  const title = (rows[0]?.[0] ?? "").trim();
  const monthMatch = title.match(/^([A-Z]+ \d{4})/i);
  const month = monthMatch?.[1] ?? "";

  // ── Find "Overall Sales" section ──────────────────────────────────────────
  let salesRow = -1;
  for (let r = 0; r < rows.length; r++) {
    if ((rows[r][0] ?? "").toLowerCase().includes("overall sales")) {
      salesRow = r;
      break;
    }
  }
  if (salesRow === -1) salesRow = 1;

  const weekHeaderRow = rows[salesRow + 1] ?? [];
  const skuHeaderRow = rows[salesRow + 2] ?? [];
  const dataStartRow = salesRow + 3;

  // ── Discover week column positions ─────────────────────────────────────────
  const weekBlocks: { label: string; startCol: number }[] = [];
  let totalQtyCol = 21;
  let mtdStartCol = 22;

  for (let c = 0; c < weekHeaderRow.length; c++) {
    const cell = (weekHeaderRow[c] ?? "").trim();
    if (/week\s*\d/i.test(cell)) {
      weekBlocks.push({ label: cell, startCol: c });
    } else if (/total\s*qty/i.test(cell)) {
      totalQtyCol = c;
    } else if (/^mtd$/i.test(cell)) {
      mtdStartCol = c;
    }
  }

  // Default to 4 weeks of 5 SKUs each if discovery fails
  if (weekBlocks.length === 0) {
    for (let w = 0; w < 4; w++) {
      weekBlocks.push({ label: `Week ${w + 1}`, startCol: 1 + w * 5 });
    }
  }

  // ── Parse store rows ────────────────────────────────────────────────────────
  const skuOrder = skuOrderFromRow(skuHeaderRow, weekBlocks[0]?.startCol ?? 1);
  const stores: StoreData[] = [];
  let totalRowData: string[] = [];

  for (let r = dataStartRow; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[0] ?? "").trim();
    if (!name) continue;
    if (/^total/i.test(name)) { totalRowData = row; break; }
    if (/overall|store location/i.test(name)) break;

    const weeks: WeekUnits[] = weekBlocks.map(({ label, startCol }) => {
      let total = 0;
      const w: WeekUnits = { label, brisk: 0, renpro: 0, stromgo: 0, halov2: 0, rengo: 0, total: 0 };
      skuOrder.forEach((sku, i) => {
        const v = num(row[startCol + i]);
        w[sku] = v;
        total += v;
      });
      w.total = total;
      return w;
    });

    const totalQty = num(row[totalQtyCol]);
    const mtdRevenue = parseIndianNum(row.slice(mtdStartCol));

    stores.push({
      name,
      shortName: storeShortName(name),
      weeks,
      totalQty,
      mtdRevenue,
    });
  }

  const grandTotalUnits = num(totalRowData[totalQtyCol]);
  const grandTotalRevenue = parseIndianNum(totalRowData.slice(mtdStartCol));

  // ── Parse "Overall Walkin" section ─────────────────────────────────────────
  let walkinRow = -1;
  for (let r = dataStartRow; r < rows.length; r++) {
    if ((rows[r][0] ?? "").toLowerCase().includes("overall walkin")) {
      walkinRow = r;
      break;
    }
  }
  if (walkinRow !== -1) {
    const walkinSkuOrder = skuOrderFromRow(rows[walkinRow + 1] ?? [], 1);
    for (let r = walkinRow + 2; r < rows.length; r++) {
      const row = rows[r];
      const name = (row[0] ?? "").trim();
      if (!name || /^total/i.test(name)) break;
      if (/overall|store location/i.test(name)) break;
      const store = stores.find(
        (s) => s.name === name || s.shortName === storeShortName(name)
      );
      if (store) {
        store.walkin = {} as Partial<Record<SKU, number>>;
        walkinSkuOrder.forEach((sku, i) => {
          store.walkin![sku] = num(row[1 + i]);
        });
      }
    }
  }

  // ── Parse "Store Location" weekly summary ──────────────────────────────────
  const weekSummaries: WeekSummary[] = [];
  let locRow = -1;
  for (let r = 0; r < rows.length; r++) {
    if ((rows[r][0] ?? "").toLowerCase().includes("store location")) {
      locRow = r;
      break;
    }
  }
  if (locRow !== -1) {
    for (let r = locRow + 1; r < rows.length; r++) {
      const row = rows[r];
      const label = (row[0] ?? "").trim();
      if (!label || /^total/i.test(label)) break;
      const units = num(row[1]);
      const revenue = parseIndianNum(row.slice(2));
      if (units > 0 || revenue > 0) {
        weekSummaries.push({ label, units, revenue });
      }
    }
  }

  return {
    title,
    month,
    stores,
    weekSummaries,
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
