export interface HistoricalStoreRow {
  storeName: string;
  storeCode: string;
  units: Record<string, number>;
  totalUnits: number;
  mtdRevenue: number;
}

export interface HistoricalMonth {
  month: string;
  shortMonth: string;
  stores: HistoricalStoreRow[];
  totalUnits: number;
  totalRevenue: number;
}

export const HISTORICAL_SKUS = ["Brisk", "Halov2", "Stromgo", "Renpro", "Rengo"] as const;

// Canonical store order — used to align rows across months
export const CANONICAL_STORE_CODES = ["DJK","DRG","UIP","HFR","DRH","DHK","UGC","DLJ","UND"] as const;

export const HISTORICAL_MONTHS: HistoricalMonth[] = [
  {
    month: "March 2025",
    shortMonth: "Mar",
    totalUnits: 132,
    totalRevenue: 1329776,
    stores: [
      { storeName: "Janakpuri",    storeCode: "DJK", totalUnits: 25, mtdRevenue: 261298, units: { Brisk: 5,  Halov2: 13, Stromgo: 3, Renpro: 4, Rengo: 0 } },
      { storeName: "Rajouri",      storeCode: "DRG", totalUnits: 29, mtdRevenue: 284000, units: { Brisk: 12, Halov2: 13, Stromgo: 1, Renpro: 2, Rengo: 1 } },
      { storeName: "Indirapuram",  storeCode: "UIP", totalUnits: 12, mtdRevenue: 108600, units: { Brisk: 7,  Halov2: 4,  Stromgo: 0, Renpro: 0, Rengo: 0 } },
      { storeName: "Faridabad",    storeCode: "HFR", totalUnits: 18, mtdRevenue: 165682, units: { Brisk: 4,  Halov2: 10, Stromgo: 3, Renpro: 0, Rengo: 0 } },
      { storeName: "Rohini",       storeCode: "DRH", totalUnits: 14, mtdRevenue: 161898, units: { Brisk: 4,  Halov2: 7,  Stromgo: 1, Renpro: 3, Rengo: 0 } },
      { storeName: "Huaz Khas",    storeCode: "DHK", totalUnits: 10, mtdRevenue: 104698, units: { Brisk: 3,  Halov2: 3,  Stromgo: 2, Renpro: 1, Rengo: 0 } },
      { storeName: "Gaur Chowk",   storeCode: "UGC", totalUnits: 0,  mtdRevenue: 0,      units: { Brisk: 0,  Halov2: 0,  Stromgo: 0, Renpro: 0, Rengo: 0 } },
      { storeName: "Lajpat",       storeCode: "DLJ", totalUnits: 0,  mtdRevenue: 0,      units: { Brisk: 0,  Halov2: 0,  Stromgo: 0, Renpro: 0, Rengo: 0 } },
      { storeName: "Noida sec 18", storeCode: "UND", totalUnits: 24, mtdRevenue: 243600, units: { Brisk: 12, Halov2: 8,  Stromgo: 4, Renpro: 2, Rengo: 0 } },
    ],
  },
  {
    month: "April 2025",
    shortMonth: "Apr",
    totalUnits: 227,
    totalRevenue: 2286021,
    stores: [
      { storeName: "Janakpuri",    storeCode: "DJK", totalUnits: 27, mtdRevenue: 279485, units: { Brisk: 1,  Halov2: 19, Stromgo: 0, Renpro: 2, Rengo: 5  } },
      { storeName: "Rajouri",      storeCode: "DRG", totalUnits: 39, mtdRevenue: 438461, units: { Brisk: 11, Halov2: 21, Stromgo: 0, Renpro: 4, Rengo: 3  } },
      { storeName: "Indirapuram",  storeCode: "UIP", totalUnits: 20, mtdRevenue: 191199, units: { Brisk: 6,  Halov2: 12, Stromgo: 0, Renpro: 1, Rengo: 1  } },
      { storeName: "Faridabad",    storeCode: "HFR", totalUnits: 21, mtdRevenue: 182579, units: { Brisk: 8,  Halov2: 9,  Stromgo: 4, Renpro: 0, Rengo: 0  } },
      { storeName: "Rohini",       storeCode: "DRH", totalUnits: 29, mtdRevenue: 294300, units: { Brisk: 11, Halov2: 12, Stromgo: 3, Renpro: 3, Rengo: 0  } },
      { storeName: "Huaz Khas",    storeCode: "DHK", totalUnits: 17, mtdRevenue: 158098, units: { Brisk: 5,  Halov2: 8,  Stromgo: 2, Renpro: 1, Rengo: 1  } },
      { storeName: "Gaur Chowk",   storeCode: "UGC", totalUnits: 9,  mtdRevenue: 74299,  units: { Brisk: 3,  Halov2: 4,  Stromgo: 0, Renpro: 0, Rengo: 2  } },
      { storeName: "Lajpat",       storeCode: "DLJ", totalUnits: 10, mtdRevenue: 102400, units: { Brisk: 0,  Halov2: 9,  Stromgo: 0, Renpro: 0, Rengo: 1  } },
      { storeName: "Noida sec 18", storeCode: "UND", totalUnits: 55, mtdRevenue: 565200, units: { Brisk: 20, Halov2: 26, Stromgo: 4, Renpro: 4, Rengo: 1  } },
    ],
  },
];
