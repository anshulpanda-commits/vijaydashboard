"use client";

import { useState } from "react";
import {
  VIJAY_REPORTED_MONTHS, VIJAY_SKUS, VIJAY_SKU_COLORS, STORE_NAME_MAP,
  type VijaySkuName,
} from "@/lib/vijayReportedData";

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function heatBg(value: number, colMax: number, color: string): string {
  if (!value || value <= 0 || !colMax) return "transparent";
  const alpha = Math.max(0.08, (value / colMax) * 0.45);
  const hex = color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function VijayReportedSection() {
  const [activeMonth, setActiveMonth] = useState(VIJAY_REPORTED_MONTHS.length - 1);
  const m = VIJAY_REPORTED_MONTHS[activeMonth];

  // Which SKUs appear in this month
  const activeSkus = VIJAY_SKUS.filter(sku => m.skus[sku] !== undefined);

  // Per-store max for each SKU (for heat intensity)
  const skuMax: Partial<Record<VijaySkuName, number>> = {};
  for (const sku of activeSkus) {
    const vals = Object.values(m.skus[sku] ?? {});
    skuMax[sku] = Math.max(...vals, 1);
  }

  return (
    <div className="space-y-6">
      <Section
        title="Vijay Sales Reported Data"
        sub="Sellout data shared directly by Vijay Sales — source of truth for promoter incentives"
      >
        {/* Month tabs */}
        <div className="flex gap-2 flex-wrap mb-5">
          {VIJAY_REPORTED_MONTHS.map((mo, i) => (
            <button key={mo.month} onClick={() => setActiveMonth(i)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                i === activeMonth
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
              }`}>
              {mo.shortMonth} {mo.month.split(" ")[1]}
            </button>
          ))}
        </div>

        {/* Summary pills */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/40 rounded-xl px-4 py-2">
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 uppercase tracking-wider font-medium">Total Units</p>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{m.grandTotal}</p>
          </div>
          {activeSkus.map(sku => (
            <div key={sku} className="bg-gray-50 dark:bg-slate-700/40 border border-gray-200 dark:border-slate-600/40 rounded-xl px-4 py-2">
              <p className="text-[10px] text-gray-500 dark:text-slate-400 uppercase tracking-wider font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: VIJAY_SKU_COLORS[sku] }} />
                {sku}
              </p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{m.skuTotals[sku] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Store × SKU table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="pb-2 pr-4 text-left text-gray-500 dark:text-slate-400 font-medium w-40">Store</th>
                {activeSkus.map(sku => (
                  <th key={sku} className="pb-2 px-3 text-right font-semibold whitespace-nowrap" style={{ color: VIJAY_SKU_COLORS[sku] }}>
                    {sku}
                  </th>
                ))}
                <th className="pb-2 px-3 text-right text-gray-600 dark:text-slate-300 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
              {m.stores.map(code => {
                const storeTotal = m.storeTotals[code] ?? 0;
                return (
                  <tr key={code} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 dark:text-slate-200">{code}</span>
                      <span className="text-gray-400 dark:text-slate-500 ml-1.5 text-[10px]">
                        {STORE_NAME_MAP[code] ?? code}
                      </span>
                    </td>
                    {activeSkus.map(sku => {
                      const val = m.skus[sku]?.[code] ?? 0;
                      const bg = heatBg(val, skuMax[sku] ?? 1, VIJAY_SKU_COLORS[sku]);
                      return (
                        <td key={sku} className="py-2 px-3 text-right" style={{ background: bg }}>
                          <span className={val > 0 ? "font-semibold text-gray-900 dark:text-white" : val < 0 ? "text-red-500 font-semibold" : "text-gray-300 dark:text-slate-600"}>
                            {val > 0 ? val : val < 0 ? val : "—"}
                          </span>
                        </td>
                      );
                    })}
                    <td className={`py-2 px-3 text-right font-bold ${storeTotal > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-slate-600"}`}>
                      {storeTotal || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-slate-600">
                <td className="pt-3 pr-4 font-semibold text-gray-600 dark:text-slate-300">Total</td>
                {activeSkus.map(sku => (
                  <td key={sku} className="pt-3 px-3 text-right font-bold" style={{ color: VIJAY_SKU_COLORS[sku] }}>
                    {m.skuTotals[sku] ?? 0}
                  </td>
                ))}
                <td className="pt-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                  {m.grandTotal}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>
    </div>
  );
}
