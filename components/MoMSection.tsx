"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { StoreData, columnColor } from "@/lib/types";
import {
  HISTORICAL_MONTHS, HISTORICAL_SKUS,
  type HistoricalStoreRow,
} from "@/lib/historicalData";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtL(n: number): string {
  if (n <= 0) return "—";
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)    return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}
function fmtLFull(n: number): string { return "₹" + n.toLocaleString("en-IN"); }

function pct(current: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((current - prev) / prev) * 100);
}

function heatBg(value: number, colMax: number, isDark: boolean, mode: "rev" | "units"): string {
  if (!value || !colMax) return "transparent";
  const alpha = Math.max(0.07, (value / colMax) * (isDark ? 0.42 : 0.52));
  return mode === "rev"
    ? `rgba(52, 211, 153, ${alpha})`
    : `rgba(99, 102, 241, ${alpha})`;
}

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

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white"
          : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
      }`}>
      {label}
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StoreSlice = Pick<HistoricalStoreRow, "storeName" | "storeCode" | "units" | "totalUnits" | "mtdRevenue">;

interface MonthEntry {
  label: string;
  month: string;
  totalRevenue: number;
  totalUnits: number;
  storeMap: Record<string, StoreSlice>;
}

// "Revenue" → mtdRevenue, "All" → totalUnits, specific SKU → units[sku]
function getValue(slice: StoreSlice | undefined, filter: string): number {
  if (!slice) return 0;
  if (filter === "Revenue") return slice.mtdRevenue;
  if (filter === "All")     return slice.totalUnits;
  return slice.units[filter] ?? 0;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  liveStores: StoreData[];
  liveColumnHeaders: string[];
  liveMonth: string;
  liveTotalUnits: number;
  liveTotalRevenue: number;
  isDark: boolean;
}

// Fixed canonical SKUs — MTD Revenue is NOT a SKU
const SKUS = Array.from(HISTORICAL_SKUS);

export default function MoMSection({
  liveStores, liveColumnHeaders, liveMonth,
  liveTotalUnits, liveTotalRevenue, isDark,
}: Props) {

  const [viewMode, setViewMode] = useState<"Revenue" | "Units">("Revenue");
  const [skuFilter, setSkuFilter] = useState("All");  // only active when viewMode=Units

  const effectiveFilter = viewMode === "Revenue" ? "Revenue" : skuFilter;

  // Build current-month store data by aggregating daily metrics from live API
  const liveStoreMap = useMemo<Record<string, StoreSlice>>(() => {
    const map: Record<string, StoreSlice> = {};
    for (const s of liveStores) {
      const units: Record<string, number> = {};
      for (const d of s.days) {
        for (const [k, v] of Object.entries(d.metrics)) {
          units[k] = (units[k] ?? 0) + v;
        }
      }
      map[s.storeCode] = {
        storeName: s.shortName, storeCode: s.storeCode,
        units, totalUnits: s.totalQty, mtdRevenue: s.mtdRevenue,
      };
    }
    return map;
  }, [liveStores]);

  // Only include live month data when it's a closed (past) month
  const liveMonthIsCurrent = useMemo(() => {
    if (!liveMonth) return true;
    const now = new Date();
    const parsed = new Date(`${liveMonth} 1`);
    return (
      parsed.getMonth() === now.getMonth() &&
      parsed.getFullYear() === now.getFullYear()
    );
  }, [liveMonth]);

  // Combined months: historical (Mar, Apr) + live only if month has closed
  const months = useMemo<MonthEntry[]>(() => {
    const hist = HISTORICAL_MONTHS.map(hm => ({
      label: hm.shortMonth,
      month: hm.month,
      totalRevenue: hm.totalRevenue,
      totalUnits: hm.totalUnits,
      storeMap: Object.fromEntries(hm.stores.map(s => [s.storeCode, s])),
    }));
    if (liveMonthIsCurrent) return hist;
    const liveLabel = liveMonth ? liveMonth.split(" ")[0].slice(0, 3) : "MTD";
    return [
      ...hist,
      {
        label: liveLabel,
        month: liveMonth ?? "Current month",
        totalRevenue: liveTotalRevenue,
        totalUnits: liveTotalUnits,
        storeMap: liveStoreMap,
      },
    ];
  }, [liveMonth, liveMonthIsCurrent, liveTotalRevenue, liveTotalUnits, liveStoreMap]);

  // Canonical store rows (April has all 9 active stores)
  const canonicalStores = HISTORICAL_MONTHS[1].stores;

  // Per-month column max for heatmap intensity scaling
  const colMaxes = useMemo(() => months.map(m => {
    const vals = canonicalStores.map(s => getValue(m.storeMap[s.storeCode], effectiveFilter));
    return Math.max(...vals, 1);
  }), [months, effectiveFilter, canonicalStores]);

  // Monthly totals for the Total row
  const monthTotals = useMemo(() => months.map(m => {
    if (effectiveFilter === "Revenue") return m.totalRevenue;
    if (effectiveFilter === "All")     return m.totalUnits;
    return canonicalStores.reduce((sum, s) => sum + (m.storeMap[s.storeCode]?.units[effectiveFilter] ?? 0), 0);
  }), [months, effectiveFilter, canonicalStores]);

  const isRev = viewMode === "Revenue";

  // Chart theme
  const chartGrid = isDark ? "#334155" : "#E2E8F0";
  const chartTick = isDark ? "#94A3B8" : "#64748B";
  const tooltipStyle = isDark
    ? { backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#F1F5F9", fontSize: 12 }
    : { backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 12 };

  // SKU chart data: one row per month, one key per (canonical) SKU
  const skuChartData = useMemo(() => months.map(m => {
    const row: Record<string, number | string> = { month: m.label };
    for (const sku of SKUS) {
      row[sku] = canonicalStores.reduce((sum, s) => sum + (m.storeMap[s.storeCode]?.units[sku] ?? 0), 0);
    }
    return row;
  }), [months, canonicalStores]);

  // SKU summary table
  const skuSummary = useMemo(() => SKUS.map(sku => {
    const vals = months.map(m =>
      canonicalStores.reduce((sum, s) => sum + (m.storeMap[s.storeCode]?.units[sku] ?? 0), 0)
    );
    return { sku, vals };
  }), [months, canonicalStores]);

  if (liveStores.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* ── MoM Heatmap ────────────────────────────────────────────────────────── */}
      <Section
        title="Month-on-Month Heatmap"
        sub={isRev ? "MTD revenue by store — Mar → Apr → current month" : "Units sold by store · select a SKU to drill down"}
      >
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          {/* Revenue / Units toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">View</span>
            <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
              {(["Revenue", "Units"] as const).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    viewMode === v
                      ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* SKU filter — only shown when Units mode is active */}
          {viewMode === "Units" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">SKU</span>
              <FilterPill label="All" active={skuFilter === "All"} onClick={() => setSkuFilter("All")} />
              {SKUS.map(sku => (
                <FilterPill key={sku} label={sku} active={skuFilter === sku} onClick={() => setSkuFilter(sku)} />
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="pb-2 pr-4 text-left text-gray-500 dark:text-slate-400 font-medium w-36">Store</th>
                {months.map((m, mi) => (
                  <th key={m.label} className="pb-2 px-3 text-right font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">
                    {m.label}
                    {mi > 0 && (() => {
                      const g = pct(monthTotals[mi], monthTotals[mi - 1]);
                      if (g === null) return null;
                      return (
                        <span className={`ml-2 text-[10px] font-normal ${g >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                          {g >= 0 ? "▲" : "▼"} {Math.abs(g)}%
                        </span>
                      );
                    })()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
              {/* Total row */}
              <tr className="bg-gray-50 dark:bg-slate-700/30">
                <td className="py-2 pr-4 font-semibold text-gray-700 dark:text-slate-200">Total</td>
                {months.map((m, mi) => {
                  const val = monthTotals[mi];
                  const g = mi > 0 ? pct(val, monthTotals[mi - 1]) : null;
                  return (
                    <td key={m.label} className="py-2 px-3 text-right">
                      <div className="font-bold text-gray-900 dark:text-white">
                        {isRev ? fmtL(val) : (val || "—")}
                      </div>
                      {g !== null && (
                        <div className={`text-[10px] ${g >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                          {g >= 0 ? "▲" : "▼"} {Math.abs(g)}% vs {months[mi - 1].label}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Store rows */}
              {canonicalStores.map(cs => (
                <tr key={cs.storeCode} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span className="font-semibold text-gray-800 dark:text-slate-200">{cs.storeCode}</span>
                    <span className="text-gray-400 dark:text-slate-500 ml-1 text-[10px]">({cs.storeName})</span>
                  </td>
                  {months.map((m, mi) => {
                    const slice = m.storeMap[cs.storeCode];
                    const val = getValue(slice, effectiveFilter);
                    const prevVal = mi > 0 ? getValue(months[mi - 1].storeMap[cs.storeCode], effectiveFilter) : null;
                    const g = prevVal !== null ? pct(val, prevVal) : null;
                    const bg = heatBg(val, colMaxes[mi], isDark, isRev ? "rev" : "units");
                    return (
                      <td key={m.label} className="py-2 px-3 text-right" style={{ background: bg }}>
                        <div className={`font-semibold ${val > 0 ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-slate-600"}`}>
                          {isRev ? fmtL(val) : (val || "—")}
                        </div>
                        {g !== null && val > 0 && (
                          <div className={`text-[10px] ${g >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                            {g >= 0 ? "▲" : "▼"} {Math.abs(g)}%
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            {/* Always show revenue reference in units mode */}
            {!isRev && (
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-slate-600">
                  <td className="pt-2 pr-4 text-[10px] italic text-gray-400 dark:text-slate-500">MTD Revenue</td>
                  {months.map(m => (
                    <td key={m.label} className="pt-2 px-3 text-right text-[10px] text-gray-400 dark:text-slate-500">
                      {fmtL(m.totalRevenue)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {isRev && (
          <p className="mt-3 text-[10px] text-gray-400 dark:text-slate-600">
            Full values — Mar: {fmtLFull(HISTORICAL_MONTHS[0].totalRevenue)} · Apr: {fmtLFull(HISTORICAL_MONTHS[1].totalRevenue)}
            {!liveMonthIsCurrent && liveTotalRevenue > 0 && ` · ${months[months.length - 1].label}: ${fmtLFull(liveTotalRevenue)}`}
          </p>
        )}
      </Section>

      {/* ── Monthly Units by SKU ──────────────────────────────────────────────── */}
      <Section
        title="Monthly Units by SKU"
        sub="Total units sold per product across all stores — month by month"
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={skuChartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis dataKey="month" tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartTick, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? "#1E293B" : "#F1F5F9" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: chartTick, paddingTop: 12 }} />
            {SKUS.map((sku, i) => (
              <Bar key={sku} dataKey={sku} name={sku} fill={columnColor(sku, i)} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {/* Summary table */}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="pb-2 pr-4 text-left text-gray-500 dark:text-slate-400 font-medium">SKU</th>
                {months.map(m => (
                  <th key={m.label} className="pb-2 px-3 text-right text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap">{m.label}</th>
                ))}
                {months.slice(1).map((m, i) => (
                  <th key={`g-${m.label}`} className="pb-2 px-2 text-right text-gray-400 dark:text-slate-500 font-medium whitespace-nowrap text-[10px]">
                    {months[i].label}→{m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
              {skuSummary.map(({ sku, vals }, si) => (
                <tr key={sku} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
                  <td className="py-2 pr-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: columnColor(sku, si) }} />
                      <span className="font-medium text-gray-800 dark:text-slate-200">{sku}</span>
                    </span>
                  </td>
                  {vals.map((v, vi) => (
                    <td key={vi} className={`py-2 px-3 text-right font-semibold ${v > 0 ? "text-gray-900 dark:text-white" : "text-gray-300 dark:text-slate-600"}`}>
                      {v || "—"}
                    </td>
                  ))}
                  {vals.slice(1).map((v, vi) => {
                    const g = pct(v, vals[vi]);
                    return (
                      <td key={`g-${vi}`} className="py-2 px-2 text-right text-[11px]">
                        {g === null ? <span className="text-gray-300 dark:text-slate-600">—</span> : (
                          <span className={g >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                            {g >= 0 ? "▲" : "▼"} {Math.abs(g)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-slate-600 font-semibold">
                <td className="pt-3 pr-4 text-gray-500 dark:text-slate-400">Total</td>
                {months.map((m, mi) => {
                  const total = SKUS.reduce((s, sku) => s + (skuChartData[mi][sku] as number), 0);
                  return <td key={m.label} className="pt-3 px-3 text-right text-indigo-600 dark:text-indigo-400">{total}</td>;
                })}
                {months.slice(1).map((_, i) => {
                  const curr = SKUS.reduce((s, sku) => s + (skuChartData[i + 1][sku] as number), 0);
                  const prev = SKUS.reduce((s, sku) => s + (skuChartData[i][sku] as number), 0);
                  const g = pct(curr, prev);
                  return (
                    <td key={`ft-g-${i}`} className="pt-3 px-2 text-right text-[11px]">
                      {g !== null && (
                        <span className={g >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}>
                          {g >= 0 ? "▲" : "▼"} {Math.abs(g)}%
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Section>
    </div>
  );
}
