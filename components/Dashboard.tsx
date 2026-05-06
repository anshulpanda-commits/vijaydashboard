"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { SalesData, StoreData, TargetConfig, columnColor, COLUMN_PALETTE } from "@/lib/types";
import MoMSection from "./MoMSection";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtRev(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}
function fmtRevFull(n: number) { return "₹" + n.toLocaleString("en-IN"); }

const STORE_PALETTE = [
  "#60A5FA","#A78BFA","#34D399","#FBBF24","#F87171",
  "#38BDF8","#FB923C","#A3E635","#E879F9","#94A3B8","#F472B6",
];

// ─── Reusable UI pieces ───────────────────────────────────────────────────────

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color ?? "text-gray-900 dark:text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-slate-500">{sub}</span>}
    </div>
  );
}

function Section({ title, sub, children, noPad }: { title: string; sub?: string; children: React.ReactNode; noPad?: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
      <div className={`px-5 pt-5 ${noPad ? "pb-3" : "pb-1"}`}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        {sub && <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className={noPad ? "" : "px-5 pb-5 mt-4"}>{children}</div>
    </div>
  );
}

// ─── Target config modal ──────────────────────────────────────────────────────

function ConfigModal({ targets, stores, onSave, onClose }: {
  targets: TargetConfig; stores: StoreData[]; onSave: (t: TargetConfig) => void; onClose: () => void;
}) {
  const [local, setLocal] = useState<TargetConfig>(targets);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-gray-900 dark:text-white font-semibold">Monthly Unit Targets</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white text-lg">✕</button>
        </div>
        <div className="space-y-3 mb-5">
          {stores.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <label className="text-sm text-gray-700 dark:text-slate-300 flex-1 truncate">
                <span className="font-semibold">{s.storeCode}</span>
                <span className="text-gray-400 dark:text-slate-500 ml-1 text-xs">({s.shortName})</span>
              </label>
              <input
                type="number"
                value={local[s.name] ?? 30}
                onChange={(e) => setLocal(t => ({ ...t, [s.name]: Number(e.target.value) }))}
                className="w-20 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-2 py-1.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
        <button onClick={() => { onSave(local); onClose(); }}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Raw / Parser Data Table ──────────────────────────────────────────────────
// Fully dynamic: columns come from the sheet headers, not hardcoded.
// Add any column to the Google Sheet and it appears here automatically.

function RawDataTable({ stores, columnHeaders, grandTotalUnits, grandTotalRevenue }: {
  stores: StoreData[];
  columnHeaders: string[];
  grandTotalUnits: number;
  grandTotalRevenue: number;
}) {
  const days = stores[0]?.days ?? [];

  // Per-day totals across all stores
  const dayTotals = days.map((_, di) => {
    const metrics: Record<string, number> = {};
    let total = 0;
    for (const h of columnHeaders) metrics[h] = 0;
    for (const s of stores) {
      const d = s.days[di];
      if (!d) continue;
      for (const h of columnHeaders) metrics[h] = (metrics[h] ?? 0) + (d.metrics[h] ?? 0);
      total += d.total;
    }
    return { metrics, total };
  });

  if (stores.length === 0) return (
    <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-10">No data loaded yet.</p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          {/* Row 1: date headers spanning metric-cols + 1 day-total col */}
          <tr className="border-b border-gray-200 dark:border-slate-600">
            <th className="pb-2 pr-3 text-left text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap" rowSpan={2}>
              Store
            </th>
            {days.map((d) => (
              <th key={d.date} colSpan={columnHeaders.length + 1}
                className="pb-2 px-1 text-center text-gray-800 dark:text-slate-200 font-semibold whitespace-nowrap border-l border-gray-100 dark:border-slate-700/50">
                {d.date}
              </th>
            ))}
            <th className="pb-2 px-2 text-right text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap" rowSpan={2}>
              MTD Units
            </th>
            <th className="pb-2 pl-3 text-right text-gray-500 dark:text-slate-400 font-medium whitespace-nowrap" rowSpan={2}>
              MTD Revenue
            </th>
          </tr>
          {/* Row 2: metric sub-headers + "Day" total under each date */}
          <tr className="border-b border-gray-200 dark:border-slate-600">
            {days.map((d) => (
              <>
                {columnHeaders.map((h, hi) => (
                  <th key={`${d.date}-${h}`}
                    className="py-1.5 px-1.5 text-right font-medium whitespace-nowrap border-l border-gray-100 dark:border-slate-700/50"
                    style={{ color: columnColor(h, hi) }}>
                    {h}
                  </th>
                ))}
                <th key={`${d.date}-day`} className="py-1.5 px-1.5 text-right text-gray-400 dark:text-slate-500 font-medium">
                  Day
                </th>
              </>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/40">
          {stores.map((s, si) => (
            <tr key={s.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/20">
              <td className="py-2 pr-3 whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: STORE_PALETTE[si % STORE_PALETTE.length] }} />
                  <span>
                    <span className="text-gray-800 dark:text-slate-200 font-semibold">{s.storeCode}</span>
                    <span className="text-gray-400 dark:text-slate-500 text-[10px] ml-1">({s.shortName})</span>
                  </span>
                </span>
              </td>
              {s.days.map((d) => (
                <>
                  {columnHeaders.map((h, hi) => {
                    const v = d.metrics[h] ?? 0;
                    return (
                      <td key={`${d.date}-${h}`}
                        className={`py-2 px-1.5 text-right border-l border-gray-100 dark:border-slate-700/50 ${v > 0 ? "text-gray-800 dark:text-white" : "text-gray-300 dark:text-slate-600"}`}>
                        {v || "—"}
                      </td>
                    );
                  })}
                  <td key={`${d.date}-day`}
                    className={`py-2 px-1.5 text-right font-semibold ${d.total > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-slate-600"}`}>
                    {d.total || "—"}
                  </td>
                </>
              ))}
              <td className="py-2 px-2 text-right text-indigo-600 dark:text-indigo-400 font-bold">{s.totalQty || "—"}</td>
              <td className="py-2 pl-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap">
                {s.mtdRevenue > 0 ? fmtRevFull(s.mtdRevenue) : "—"}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="border-t-2 border-gray-300 dark:border-slate-600 font-semibold">
            <td className="pt-3 pr-3 text-gray-500 dark:text-slate-400">Total</td>
            {dayTotals.map((dt, di) => (
              <>
                {columnHeaders.map((h, hi) => (
                  <td key={`ft-${di}-${h}`}
                    className={`pt-3 px-1.5 text-right border-l border-gray-100 dark:border-slate-700/50 ${(dt.metrics[h] ?? 0) > 0 ? "text-gray-700 dark:text-slate-200" : "text-gray-300 dark:text-slate-600"}`}>
                    {dt.metrics[h] || "—"}
                  </td>
                ))}
                <td key={`ft-${di}-day`} className={`pt-3 px-1.5 text-right ${dt.total > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-gray-300 dark:text-slate-600"}`}>
                  {dt.total || "—"}
                </td>
              </>
            ))}
            <td className="pt-3 px-2 text-right text-indigo-600 dark:text-indigo-400">{grandTotalUnits}</td>
            <td className="pt-3 pl-3 text-right text-emerald-600 dark:text-emerald-400">
              {grandTotalRevenue > 0 ? fmtRevFull(grandTotalRevenue) : "—"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]           = useState<SalesData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [targets, setTargets]     = useState<TargetConfig>({});
  const [showConfig, setShowConfig] = useState(false);
  const [isDark, setIsDark]       = useState(true);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    loadData();
    try {
      const t = localStorage.getItem("vjd_targets"); if (t) setTargets(JSON.parse(t));
      const th = localStorage.getItem("vjd_theme");  if (th === "light") setIsDark(false);
    } catch {}
  }, [loadData]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("vjd_theme", isDark ? "dark" : "light");
  }, [isDark]);

  function saveTargets(t: TargetConfig) {
    setTargets(t);
    localStorage.setItem("vjd_targets", JSON.stringify(t));
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const stores          = data?.stores          ?? [];
  const columnHeaders   = data?.columnHeaders   ?? [];
  const grandTotalUnits   = data?.grandTotalUnits   ?? 0;
  const grandTotalRevenue = data?.grandTotalRevenue ?? 0;
  const month      = data?.month      ?? "";
  const title      = data?.title      ?? "";
  const lastUpdated = data?.lastUpdated ?? "";

  const bestStoreObj = useMemo(
    () => [...stores].sort((a, b) => b.totalQty - a.totalQty)[0] ?? null,
    [stores]
  );

  const codeToName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of stores) m[s.storeCode] = s.shortName;
    return m;
  }, [stores]);

  const avgRevPerUnit = grandTotalUnits > 0 ? Math.round(grandTotalRevenue / grandTotalUnits) : 0;

  // Daily units chart data — one entry per date, metrics keyed by column header
  const dailyChartData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const store of stores) {
      for (const day of store.days) {
        if (!map[day.date]) {
          const init: Record<string, number> = {};
          for (const h of columnHeaders) init[h] = 0;
          map[day.date] = init;
        }
        for (const h of columnHeaders) map[day.date][h] += day.metrics[h] ?? 0;
      }
    }
    return Object.entries(map)
      .filter(([, m]) => Object.values(m).some(v => v > 0))
      .map(([date, metrics]) => ({ date, ...metrics }));
  }, [stores, columnHeaders]);

  // Revenue by store
  const revenueByStore = useMemo(
    () => [...stores].filter(s => s.mtdRevenue > 0)
      .sort((a, b) => b.mtdRevenue - a.mtdRevenue)
      .map(s => ({ store: s.storeCode, storeName: s.shortName, revenue: s.mtdRevenue })),
    [stores]
  );

  // Units by store with target
  const unitsByStore = useMemo(
    () => [...stores].sort((a, b) => b.totalQty - a.totalQty)
      .map(s => ({ store: s.storeCode, storeName: s.shortName, units: s.totalQty, target: targets[s.name] ?? 30 })),
    [stores, targets]
  );

  // Metric mix (pie) — total per column header across all stores & days
  const metricMix = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const h of columnHeaders) totals[h] = 0;
    for (const s of stores) for (const d of s.days)
      for (const h of columnHeaders) totals[h] += d.metrics[h] ?? 0;
    return columnHeaders
      .map((h, i) => ({ name: h, value: totals[h], color: columnColor(h, i) }))
      .filter(e => e.value > 0);
  }, [stores, columnHeaders]);

  // Chart theme
  const chartGrid    = isDark ? "#334155" : "#E2E8F0";
  const chartTick    = isDark ? "#94A3B8" : "#64748B";
  const chartTickDim = isDark ? "#475569" : "#94A3B8";
  const chartCursor  = isDark ? "#1E293B" : "#F1F5F9";
  const tooltipStyle = isDark
    ? { backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, color: "#F1F5F9", fontSize: 12 }
    : { backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, color: "#1E293B", fontSize: 12 };

  // ── Loading / error ──────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm animate-pulse">Loading dashboard…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg bg-white dark:bg-slate-800 border border-red-500/30 rounded-2xl p-8 text-center">
        <h1 className="text-gray-900 dark:text-white text-xl font-semibold mb-3">Could not load dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mb-5">{error}</p>
        <button onClick={() => loadData()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors">
          Try again
        </button>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      {showConfig && (
        <ConfigModal targets={targets} stores={stores} onSave={saveTargets} onClose={() => setShowConfig(false)} />
      )}

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xl tracking-tight">NUUK</span>
              <span className="text-gray-300 dark:text-slate-600">×</span>
              <span className="text-gray-700 dark:text-slate-300 font-medium">Vijay Sales</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {month} · refreshed {lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setIsDark(d => !d)}
              className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-slate-300 transition-colors">
              {isDark ? "Light mode" : "Dark mode"}
            </button>
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-slate-300 transition-colors disabled:opacity-50">
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button onClick={() => setShowConfig(true)}
              className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-gray-700 dark:text-slate-300 transition-colors">
              Set Targets
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="MTD Units" value={grandTotalUnits.toString()} sub={`across ${stores.filter(s => s.totalQty > 0).length} stores`} color="text-indigo-600 dark:text-indigo-400" />
          <Card label="MTD Revenue" value={fmtRev(grandTotalRevenue)} sub={grandTotalRevenue > 0 ? fmtRevFull(grandTotalRevenue) : "not yet entered"} color="text-emerald-600 dark:text-emerald-400" />
          <Card label="Top Store" value={bestStoreObj?.storeCode ?? "—"} sub={bestStoreObj?.shortName ?? "by units sold"} color="text-amber-600 dark:text-amber-400" />
          <Card label="Avg Rev / Unit" value={avgRevPerUnit > 0 ? fmtRev(avgRevPerUnit) : "—"} sub="blended across products" />
        </div>

        {/* Daily units chart */}
        <Section title="Daily Units by Product" sub="All stores combined — stacked by product">
          <div className="px-5 pb-5">
            {dailyChartData.length === 0 ? (
              <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-10">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis dataKey="date" tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chartTick, fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: chartCursor }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: chartTick, paddingTop: 12 }} />
                  {columnHeaders.map((h, i) => (
                    <Bar key={h} dataKey={h} name={h} stackId="a" fill={columnColor(h, i)}
                      radius={i === columnHeaders.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        {/* Revenue + Units by store */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section title="MTD Revenue by Store" sub="Actual revenue from sheet">
            <div className="px-5 pb-5">
              {revenueByStore.length === 0 ? (
                <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-10">No revenue data entered yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revenueByStore} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} horizontal={false} />
                    <XAxis type="number" tick={{ fill: chartTick, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtRev} />
                    <YAxis type="category" dataKey="store" width={96} axisLine={false} tickLine={false}
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const code = payload.value as string;
                        const name = codeToName[code] ?? "";
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text textAnchor="end" fill={chartTick} fontSize={10} fontWeight={600} dy={-3}>{code}</text>
                            <text textAnchor="end" fill={chartTickDim} fontSize={8} dy={9}>{name}</text>
                          </g>
                        );
                      }}
                    />
                    <Tooltip contentStyle={tooltipStyle}
                      formatter={(v: number) => [fmtRevFull(v), "Revenue"]}
                      labelFormatter={(label: string) => `${label} · ${codeToName[label] ?? ""}`}
                      cursor={{ fill: chartCursor }} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {revenueByStore.map((_, i) => <Cell key={i} fill={STORE_PALETTE[i % STORE_PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Section>

          <Section title="MTD Units by Store" sub="vs monthly target">
            <div className="px-5 pb-5 space-y-3">
              {unitsByStore.map((row, i) => {
                const pct = Math.min(100, row.target > 0 ? (row.units / row.target) * 100 : 0);
                return (
                  <div key={row.store}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>
                        <span className="text-gray-800 dark:text-slate-200 font-semibold">{row.store}</span>
                        <span className="text-gray-400 dark:text-slate-500 ml-1">({row.storeName})</span>
                      </span>
                      <span className="text-gray-500 dark:text-slate-400">{row.units} / {row.target}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: STORE_PALETTE[i % STORE_PALETTE.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Product mix donut */}
        <Section title="Product Mix — MTD" sub="Share of units sold per product across all stores">
          <div className="px-5 pb-5 flex flex-wrap gap-8 items-center justify-center lg:justify-start">
            <div className="flex-shrink-0">
              {metricMix.length > 0 ? (
                <PieChart width={200} height={200}>
                  <Pie data={metricMix} cx={100} cy={100} innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {metricMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [`${v} units`, n]} />
                </PieChart>
              ) : <p className="text-gray-400 dark:text-slate-500 text-sm py-10">No data</p>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
              {metricMix.map((e) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: e.color }} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{e.name}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{e.value} units</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {grandTotalUnits > 0 ? Math.round((e.value / grandTotalUnits) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Month-on-Month & SKU sections ─────────────────────────────────── */}
        <MoMSection
          liveStores={stores}
          liveColumnHeaders={columnHeaders}
          liveMonth={month}
          liveTotalUnits={grandTotalUnits}
          liveTotalRevenue={grandTotalRevenue}
          isDark={isDark}
        />

        {/* ── Parser / Raw Data Table ─────────────────────────────────────────
            Always visible. Columns are driven entirely by the Google Sheet headers.
            Add a column to the sheet → it appears here automatically.
        ────────────────────────────────────────────────────────────────────── */}
        <Section
          title="Live Data from Google Sheet"
          sub={`Parsed directly from the sheet · ${columnHeaders.length} metrics tracked · add a column to the sheet and it appears here automatically`}
          noPad
        >
          <div className="px-5 pb-5">
            <RawDataTable
              stores={stores}
              columnHeaders={columnHeaders}
              grandTotalUnits={grandTotalUnits}
              grandTotalRevenue={grandTotalRevenue}
            />
          </div>
        </Section>

        <p className="text-center text-xs text-gray-400 dark:text-slate-600 pb-6">
          Data fetched live · {title}
        </p>
      </main>
    </div>
  );
}
