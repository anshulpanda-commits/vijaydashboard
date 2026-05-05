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

export interface DayUnits {
  date: string;       // "May 1", "May 2", etc.
  brisk: number;
  renpro: number;
  stromgo: number;
  halov2: number;
  rengo: number;
  total: number;
  mtdRevenue: number; // MTD revenue column after this day (accumulates)
}

export interface StoreData {
  name: string;
  shortName: string;
  days: DayUnits[];
  totalQty: number;   // MTD units (col B in sheet)
  mtdRevenue: number; // latest non-zero MTD revenue across all days
  walkin?: Partial<Record<SKU, number>>;
}

export interface SalesData {
  title: string;
  month: string;
  stores: StoreData[];
  grandTotalUnits: number;
  grandTotalRevenue: number;
  lastUpdated: string;
}

export interface TargetConfig {
  [store: string]: number;
}
