export interface DayData {
  date: string;                     // "May 1", "May 2", etc.
  metrics: Record<string, number>;  // column header → value, e.g. { Brisk: 3, Halov2: 1, … }
  total: number;                    // sum of all metrics for that day
  mtdRevenue: number;               // MTD revenue column (accumulates; 0 if not yet entered)
}

export interface StoreData {
  name: string;
  shortName: string;
  days: DayData[];
  totalQty: number;   // MTD units — col B in the sheet
  mtdRevenue: number; // latest non-zero MTD revenue across all days
}

export interface SalesData {
  title: string;
  month: string;
  columnHeaders: string[];  // ordered list of metric columns (e.g. ["Brisk","Halov2","Stromgo","Renpro","Rengo"])
  stores: StoreData[];
  grandTotalUnits: number;
  grandTotalRevenue: number;
  lastUpdated: string;
}

export interface TargetConfig {
  [store: string]: number;
}

// Palette for dynamic columns — first 5 match the classic SKU colours
export const COLUMN_PALETTE = [
  "#60A5FA", "#A78BFA", "#34D399", "#FBBF24", "#F87171",
  "#38BDF8", "#FB923C", "#A3E635", "#E879F9", "#94A3B8", "#F472B6",
];

export function columnColor(header: string, index: number): string {
  const KNOWN: Record<string, string> = {
    brisk: "#60A5FA",
    "ren pro": "#FBBF24", renpro: "#FBBF24",
    "strom go": "#34D399", stromgo: "#34D399",
    "halo v2": "#A78BFA", halov2: "#A78BFA",
    "ren go": "#F87171", rengo: "#F87171",
  };
  return KNOWN[header.toLowerCase()] ?? COLUMN_PALETTE[index % COLUMN_PALETTE.length];
}
