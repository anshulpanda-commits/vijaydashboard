// ─── Master outlet list ───────────────────────────────────────────────────────

export interface MasterStore {
  code: string;
  name: string;
}

export const MASTER_STORES: MasterStore[] = [
  { code: "DRG", name: "Rajouri Garden" },
  { code: "DLJ", name: "Lajpat Nagar" },
  { code: "DVM", name: "Vikas Marg" },
  { code: "UND", name: "Noida Sec-18" },
  { code: "HGG", name: "Gurgaon Sec-29" },
  { code: "DRH", name: "Rohini" },
  { code: "DJK", name: "Janakpuri" },
  { code: "DHK", name: "Hauz Khas" },
  { code: "UIP", name: "Indirapuram" },
  { code: "UGC", name: "Gaur Chowk" },
  { code: "HMM", name: "Mewala Faridabad" },
  { code: "DMT", name: "Model Town" },
  { code: "DNW", name: "Nawada" },
  { code: "DPN", name: "Patel Nagar" },
  { code: "DBH", name: "Budh Vihar" },
  { code: "DSK", name: "Saket" },
  { code: "DUN", name: "Uttam Nagar" },
];

export const STORE_NAME_MAP: Record<string, string> = Object.fromEntries(
  MASTER_STORES.map(s => [s.code, s.name])
);

// ─── SKU definitions ──────────────────────────────────────────────────────────

export const VIJAY_SKUS = [
  "Brisk", "Halov2", "Rengo", "Stromgo", "Renpro", "HotBar", "HotBlox",
] as const;

export type VijaySkuName = typeof VIJAY_SKUS[number];

export const VIJAY_SKU_COLORS: Record<VijaySkuName, string> = {
  Brisk:   "#60A5FA",
  Halov2:  "#A78BFA",
  Rengo:   "#F87171",
  Stromgo: "#34D399",
  Renpro:  "#FBBF24",
  HotBar:  "#FB923C",
  HotBlox: "#38BDF8",
};

// Full product names → SKU bucket (used for future parsing of new reports)
export const SKU_MAP: Record<string, VijaySkuName> = {
  "NUUK BRISK AIR FRYER 6.5L( RED)":                                    "Brisk",
  "NUUK BRISK AIR FRYER 6.5L(SERENE GREY )":                            "Brisk",
  "DEMO NUUK BRISK AIR FRYER 6.5L(SERENE GREY )":                       "Brisk",
  "NUUK HALO 3D AIR CIRCULATION FAN WITH MOOD LIGHT BKR":               "Halov2",
  "NUUK HALO 3D AIR CIRCULATION FAN WITH MOOD LIGHT WHR":               "Halov2",
  "NUUK REN GO 4-IN-1 11KPA CORDLESS HANDHELD VACUUM CLEANER":          "Rengo",
  "NUUK STROM GO V2 TRAVEL GARMENT STREAMER WITH FABRIC BRUSH GREY":    "Stromgo",
  "NUUK STROM GO V2 TRAVEL GARMENT STREAMER WITH FABRIC BRUSH RED":     "Stromgo",
  "NUUK VC REN PRO 34 KPA CORD-FREE VACUUM CLEANER":                    "Renpro",
  "NUUK HOT BAR INSTANT HEATING AND TOUCH PANEL ELECTRIC BLUE":         "HotBar",
  "NUUK HOT BAR INSTANT HEATING AND TOUCH PANEL NUUK RED":              "HotBar",
  "NUUK HOT BAR INSTANT HEATING AND TOUCH PANEL SERENE GREY":           "HotBar",
  "NUUK HOT BLOX SMART OFR WITH RAPIDHEAT & DGL TG DIS SERENE GREY":   "HotBlox",
  "NUUK HOT BLOX SMART OFR WITH RAPIDHEAT &DG TC DIS MIDNIGHT BLACK":  "HotBlox",
};

// ─── Monthly sellout data ─────────────────────────────────────────────────────
// Source: Vijay Sales email reports
// Structure: skus[SKU][storeCode] = units sold

export interface VijayReportedMonth {
  month: string;
  shortMonth: string;
  stores: string[];    // store codes present in this month's report
  skus: Partial<Record<VijaySkuName, Record<string, number>>>;
  storeTotals: Record<string, number>;
  skuTotals: Partial<Record<VijaySkuName, number>>;
  grandTotal: number;
}

export const VIJAY_REPORTED_MONTHS: VijayReportedMonth[] = [
  {
    month: "January 2026",
    shortMonth: "Jan",
    stores: ["DBH","DHK","DJK","DLJ","DNW","DPN","DRG","DRH","DVM","HGG","HMM","UGC","UIP","UND"],
    skus: {
      Brisk:   { DJK: 1, HMM: 1, UND: 1 },
      HotBar:  { DBH: 1, DHK: 12, DJK: 15, DLJ: 10, DRG: 5, DRH: 11, DVM: 11, HGG: 10, HMM: 9, UGC: 16, UIP: 17, UND: 29 },
      HotBlox: { DHK: 11, DJK: 19, DLJ: 16, DNW: 1, DPN: 1, DRG: 34, DRH: 13, DVM: 12, HGG: 21, HMM: 16, UGC: 14, UIP: 30, UND: 29 },
    },
    storeTotals: { DBH: 1, DHK: 23, DJK: 35, DLJ: 26, DNW: 1, DPN: 1, DRG: 39, DRH: 24, DVM: 23, HGG: 31, HMM: 26, UGC: 30, UIP: 47, UND: 59 },
    skuTotals:   { Brisk: 3, HotBar: 146, HotBlox: 217 },
    grandTotal: 366,
  },
  {
    month: "February 2026",
    shortMonth: "Feb",
    stores: ["DHK","DJK","DRG","DRH","DVM","HGG","HMM","UGC","UIP","UND"],
    skus: {
      Brisk:   { DHK: 1, DJK: 5, DRG: 6, DRH: 7, DVM: 2, HMM: 4, UGC: 3, UIP: 4, UND: 10 },
      HotBar:  { DHK: 2, DRH: 1, DVM: 1, HGG: 0 },
      HotBlox: { DHK: -1, DRH: 1, DVM: 1, HMM: 1, UIP: 1 },
      Renpro:  { DVM: 1, HMM: 2, UND: 1 },
    },
    storeTotals: { DHK: 2, DJK: 5, DRG: 6, DRH: 9, DVM: 5, HGG: 0, HMM: 7, UGC: 3, UIP: 5, UND: 11 },
    skuTotals:   { Brisk: 42, HotBar: 4, HotBlox: 3, Renpro: 4 },
    grandTotal: 53,
  },
  {
    month: "March 2026",
    shortMonth: "Mar",
    stores: ["DHK","DJK","DLJ","DRG","DRH","DUN","DVM","HGG","HMM","UGC","UIP","UND"],
    skus: {
      Brisk:   { DHK: 3, DJK: 7, DRG: 10, DRH: 5, DVM: 3, HGG: 1, HMM: 4, UIP: 8, UND: 13 },
      Halov2:  { DHK: 5, DJK: 11, DLJ: 3, DRG: 13, DRH: 6, DUN: 1, HGG: 3, HMM: 11, UGC: 3, UIP: 5, UND: 5 },
      Stromgo: { DHK: 1, DJK: 3, DLJ: 1, DRG: 1, DRH: 1, HMM: 3, UIP: 1, UND: 4 },
      Renpro:  { DJK: 4, DRG: 3, DRH: 4, UND: 2 },
    },
    storeTotals: { DHK: 9, DJK: 25, DLJ: 4, DRG: 27, DRH: 16, DUN: 1, DVM: 3, HGG: 4, HMM: 18, UGC: 3, UIP: 14, UND: 24 },
    skuTotals:   { Brisk: 54, Halov2: 66, Stromgo: 15, Renpro: 13 },
    grandTotal: 148,
  },
  {
    month: "April 2026",
    shortMonth: "Apr",
    stores: ["DHK","DJK","DLJ","DRG","DRH","DSK","HGG","HMM","UGC","UIP","UND"],
    skus: {
      Brisk:   { DHK: 1, DRG: 10, DRH: 10, DSK: 4, HGG: 1, HMM: 8, UGC: 3, UIP: 6, UND: 20 },
      Halov2:  { DHK: 5, DJK: 19, DLJ: 8, DRG: 20, DRH: 12, DSK: 5, HGG: 8, HMM: 9, UGC: 4, UIP: 12, UND: 26 },
      Rengo:   { DHK: 1, DJK: 5, DLJ: 1, DRG: 4, UGC: 2, UIP: 1, UND: 1 },
      Stromgo: { DRH: 3, DSK: 2, HMM: 4, UND: 4 },
      Renpro:  { DJK: 2, DRG: 4, DRH: 3, DSK: 1, UIP: 1, UND: 4 },
    },
    storeTotals: { DHK: 7, DJK: 26, DLJ: 9, DRG: 38, DRH: 28, DSK: 12, HGG: 9, HMM: 21, UGC: 9, UIP: 20, UND: 55 },
    skuTotals:   { Brisk: 63, Halov2: 128, Rengo: 15, Stromgo: 13, Renpro: 15 },
    grandTotal: 234,
  },
];
