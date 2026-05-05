export type SKU = "brisk" | "renpro" | "stromgo" | "halov2" | "rengo";

export const SKUS: SKU[] = ["brisk", "renpro", "stromgo", "halov2", "rengo"];

export const SKU_LABELS: Record<SKU, string> = {
  brisk: "Brisk",
  renpro: "Ren Pro",
  stromgo: "Strom Go",
  halov2: "Halo V2",
  rengo: "Ren Go",
};

export const SKU_COLORS: Record<SKU, string> = {
  brisk: "#60A5FA",
  renpro: "#FBBF24",
  stromgo: "#34D399",
  halov2: "#A78BFA",
  rengo: "#F87171",
};

// Units sold in one week (all SKUs)
export interface WeekUnits {
  label: string; // "Week 1 (1st-8th Mar)"
  brisk: number;
  renpro: number;
  stromgo: number;
  halov2: number;
  rengo: number;
  total: number;
}

// Per-store data parsed from the "Overall Sales" section
export interface StoreData {
  name: string;
  shortName: string;
  weeks: WeekUnits[]; // one per week column in the sheet
  totalQty: number;   // Total QTY column (units)
  mtdRevenue: number; // MTD column (₹, Indian comma format reconstructed)
  walkin?: Partial<Record<SKU, number>>; // from "Overall Walkin" section
}

// From the "Store Location" summary section at the bottom
export interface WeekSummary {
  label: string;   // "1st week", "2nd week", …
  units: number;
  revenue: number; // ₹
}

export interface SalesData {
  title: string;   // "MAR 2025 Sales Summary: Vijay sales"
  month: string;   // "MAR 2025"
  stores: StoreData[];
  weekSummaries: WeekSummary[];
  grandTotalUnits: number;
  grandTotalRevenue: number;
  lastUpdated: string;
}

export interface TargetConfig {
  [store: string]: number; // monthly unit target
}
