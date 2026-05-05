"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  SalesData,
  SKU,
  SKU_COLORS,
  SKU_LABELS,
  SKUS,
  StoreData,
  TargetConfig,
} from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtRev(n: number) {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(2)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function fmtRevFull(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

const TOOLTIP_STYLE = {
  backgroundColor: "#1E293B",
  border: "1px solid #334155",
  borderRadius: 8,
  color: "#F1F5F9",
  fontSize: 12,
};

const STORE_PALETTE = [
  "#60A5FA", "#A78BFA", "#34D399", "#FBBF24", "#F87171",
  "#38BDF8", "#FB923C", "#A3E635", "#E879F9", "#94A3B8", "#F472B6",
];

// ─── Small components ─────────────────────────────────────────────────────────

function Card({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function Section({ title, sub, children }: {
  title: string; sub?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Target config modal ──────────────────────────────────────────────────────

function ConfigModal({
  targets,
  stores,
  onSave,
  onClose,
}: {
  targets: TargetConfig;
  stores: StoreData[];
  onSave: (t: TargetConfig) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<TargetConfig>(targets);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-white font-semibold">Monthly Unit Targets</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">✕</button>
        </div>
        <div className="space-y-3 mb-5">
          {stores.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <label className="text-sm text-slate-300 flex-1 truncate">{s.shortName}</label>
              <input
                type="number"
                value={local[s.name] ?? 30}
                onChange={(e) => setLocal((t) => ({ ...t, [s.name]: Number(e.target.value) }))}
                className="w-20 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => { onSave(local); onClose(); }}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Raw Data View ────────────────────────────────────────────────────────────

function RawDataView({ stores }: { stores: StoreData[] }) {
  if (stores.length === 0) {
    return <p className="text-slate-500 text-sm text-center py-20">No data loaded yet.</p>;
  }

  const weeks = stores[0]?.weeks ?? [];

  // Grand totals per week per SKU
  const weekTotals = weeks.map((_, wi) => {
    const t: Record<SKU, number> & { total: number } = { brisk: 0, renpro: 0, stromgo: 0, halov2: 0, rengo: 0, total: 0 };
    for (const s of stores) {
      const w = s.weeks[wi];
      if (!w) continue;
      for (const sku of SKUS) t[sku] += w[sku];
      t.total += w.total;
    }
    return t;
  });
  const grandTotal = { units: stores.reduce((s, r) => s + r.totalQty, 0) };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">Raw Sheet Data</h2>
          <p className="text-xs text-slate-400 mt-0.5">Exactly as received from Google Sheets — units per SKU per week per store</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px] border-collapse">
            <thead>
              {/* Row 1: Week labels spanning 5 SKU columns each */}
              <tr>
                <th className="pb-1 pr-3 text-left text-slate-400 font-medium align-bottom" rowSpan={2}>Store</th>
                {weeks.map((w) => (
                  <th
                    key={w.label}
                    colSpan={SKUS.length + 1}
                    className="pb-1 px-1 text-center text-slate-200 font-semibold border-b border-slate-600 whitespace-nowrap"
                  >
                    {w.label}
                  </th>
                ))}
                <th className="pb-1 px-2 text-right text-slate-400 font-medium align-bottom" rowSpan={2}>Total Units</th>
                <th className="pb-1 pl-2 text-right text-slate-400 font-medium align-bottom whitespace-nowrap" rowSpan={2}>MTD Rev</th>
              </tr>
              {/* Row 2: SKU sub-headers under each week */}
              <tr>
                {weeks.map((w) => (
                  <>
                    {SKUS.map((sku) => (
                      <th key={`${w.label}-${sku}`} className="py-1.5 px-1.5 text-right font-medium whitespace-nowrap" style={{ color: SKU_COLORS[sku] }}>
                        {SKU_LABELS[sku]}
                      </th>
                    ))}
                    <th key={`${w.label}-total`} className="py-1.5 px-1.5 text-right text-slate-400 font-medium">Total</th>
                  </>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/40">
              {stores.map((s, si) => (
                <tr key={s.name} className="hover:bg-slate-700/20">
                  <td className="py-2 pr-3 text-slate-200 font-medium whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STORE_PALETTE[si % STORE_PALETTE.length] }} />
                      {s.shortName}
                    </span>
                  </td>
                  {s.weeks.map((w) => (
                    <>
                      {SKUS.map((sku) => (
                        <td key={`${w.label}-${sku}`} className={`py-2 px-1.5 text-right ${w[sku] > 0 ? "text-white" : "text-slate-600"}`}>
                          {w[sku] || "—"}
                        </td>
                      ))}
                      <td key={`${w.label}-total`} className={`py-2 px-1.5 text-right font-semibold ${w.total > 0 ? "text-indigo-400" : "text-slate-600"}`}>
                        {w.total || "—"}
                      </td>
                    </>
                  ))}
                  <td className="py-2 px-2 text-right text-indigo-400 font-bold">{s.totalQty || "—"}</td>
                  <td className="py-2 pl-2 text-right text-emerald-400 font-semibold whitespace-nowrap">
                    {s.mtdRevenue > 0 ? "₹" + s.mtdRevenue.toLocaleString("en-IN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600 font-semibold">
                <td className="pt-3 pr-3 text-slate-400">Total</td>
                {weekTotals.map((wt, wi) => (
                  <>
                    {SKUS.map((sku) => (
                      <td key={`total-${wi}-${sku}`} className="pt-3 px-1.5 text-right text-slate-200">
                        {wt[sku] || "—"}
                      </td>
                    ))}
                    <td key={`total-${wi}-sum`} className="pt-3 px-1.5 text-right text-indigo-400">
                      {wt.total || "—"}
                    </td>
                  </>
                ))}
                <td className="pt-3 px-2 text-right text-indigo-400">{grandTotal.units}</td>
                <td className="pt-3 pl-2 text-right text-emerald-400">
                  {"₹" + stores.reduce((s, r) => s + r.mtdRevenue, 0).toLocaleString("en-IN")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [targets, setTargets] = useState<TargetConfig>({});
  const [showConfig, setShowConfig] = useState(false);
  const [view, setView] = useState<"dashboard" | "raw">("dashboard");

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sales");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    try {
      const t = localStorage.getItem("vjd_targets");
      if (t) setTargets(JSON.parse(t));
    } catch {}
  }, [loadData]);

  function saveTargets(t: TargetConfig) {
    setTargets(t);
    localStorage.setItem("vjd_targets", JSON.stringify(t));
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const stores = data?.stores ?? [];
  const weekSummaries = data?.weekSummaries ?? [];
  const grandTotalUnits = data?.grandTotalUnits ?? 0;
  const grandTotalRevenue = data?.grandTotalRevenue ?? 0;
  const month = data?.month ?? "";
  const title = data?.title ?? "";
  const lastUpdated = data?.lastUpdated ?? "";

  const bestStore = useMemo(
    () => [...stores].sort((a, b) => b.totalQty - a.totalQty)[0]?.shortName ?? "—",
    [stores]
  );

  const avgRevPerUnit = grandTotalUnits > 0
    ? Math.round(grandTotalRevenue / grandTotalUnits)
    : 0;

  const weeklyUnitsData = useMemo(() => {
    const weekMap: Record<string, Record<SKU, number>> = {};
    for (const store of stores) {
      for (const week of store.weeks) {
        if (!weekMap[week.label]) {
          weekMap[week.label] = { brisk: 0, renpro: 0, stromgo: 0, halov2: 0, rengo: 0 };
        }
        for (const sku of SKUS) {
          weekMap[week.label][sku] += week[sku];
        }
      }
    }
    return Object.entries(weekMap).map(([label, skus]) => ({
      label: label.replace(/week\s*(\d)/i, "Wk $1").replace(/\(.*\)/, "").trim(),
      fullLabel: label,
      ...skus,
    }));
  }, [stores]);

  const revenueByStore = useMemo(
    () => [...stores]
      .filter((s) => s.mtdRevenue > 0)
      .sort((a, b) => b.mtdRevenue - a.mtdRevenue)
      .map((s) => ({ store: s.shortName, revenue: s.mtdRevenue })),
    [stores]
  );

  const unitsByStore = useMemo(
    () => [...stores]
      .sort((a, b) => b.totalQty - a.totalQty)
      .map((s) => ({
        store: s.shortName,
        units: s.totalQty,
        target: targets[s.name] ?? 30,
      })),
    [stores, targets]
  );

  const skuMix = useMemo(() => {
    const totals = { brisk: 0, renpro: 0, stromgo: 0, halov2: 0, rengo: 0 };
    for (const store of stores) {
      for (const week of store.weeks) {
        for (const sku of SKUS) totals[sku] += week[sku];
      }
    }
    return SKUS
      .map((sku) => ({ name: SKU_LABELS[sku], value: totals[sku], color: SKU_COLORS[sku] }))
      .filter((e) => e.value > 0);
  }, [stores]);

  const walkinData = useMemo(() => {
    const totals: Record<SKU, { walkin: number; sold: number }> = {
      brisk: { walkin: 0, sold: 0 },
      renpro: { walkin: 0, sold: 0 },
      stromgo: { walkin: 0, sold: 0 },
      halov2: { walkin: 0, sold: 0 },
      rengo: { walkin: 0, sold: 0 },
    };
    for (const store of stores) {
      for (const sku of SKUS) {
        const walkin = store.walkin?.[sku] ?? 0;
        const sold = store.weeks.reduce((s, w) => s + w[sku], 0);
        totals[sku].walkin += walkin;
        totals[sku].sold += sold;
      }
    }
    return SKUS.map((sku) => ({
      sku,
      label: SKU_LABELS[sku],
      color: SKU_COLORS[sku],
      walkin: totals[sku].walkin,
      sold: totals[sku].sold,
      rate: totals[sku].walkin > 0
        ? Math.round((totals[sku].sold / totals[sku].walkin) * 100)
        : 0,
    }));
  }, [stores]);

  const hasWalkin = stores.some((s) => s.walkin);

  // ── Loading / error states ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-lg bg-slate-800 border border-red-500/30 rounded-2xl p-8 text-center">
          <h1 className="text-white text-xl font-semibold mb-3">Could not load dashboard</h1>
          <p className="text-slate-400 text-sm mb-5">{error}</p>
          <button
            onClick={() => loadData()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {showConfig && (
        <ConfigModal
          targets={targets}
          stores={stores}
          onSave={saveTargets}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-400 font-bold text-xl tracking-tight">NUUK</span>
              <span className="text-slate-600">×</span>
              <span className="text-slate-300 font-medium">Vijay Sales</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {month} · refreshed {lastUpdated ? new Date(lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setView("dashboard")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${view === "dashboard" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setView("raw")}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${view === "raw" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Raw Data
              </button>
            </div>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 transition-colors disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
            {view === "dashboard" && (
              <button
                onClick={() => setShowConfig(true)}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 transition-colors"
              >
                Set Targets
              </button>
            )}
          </div>
        </div>
      </header>

      {view === "raw" && <RawDataView stores={stores} />}

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 ${view === "raw" ? "hidden" : ""}`}>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card label="MTD Units" value={grandTotalUnits.toString()} sub={`across ${stores.filter(s => s.totalQty > 0).length} stores`} color="text-indigo-400" />
          <Card label="MTD Revenue" value={fmtRev(grandTotalRevenue)} sub={fmtRevFull(grandTotalRevenue)} color="text-emerald-400" />
          <Card label="Top Store" value={bestStore} sub="by units sold" color="text-amber-400" />
          <Card label="Avg Rev / Unit" value={fmtRev(avgRevPerUnit)} sub="blended across SKUs" />
        </div>

        {/* Weekly units — stacked by SKU */}
        <Section title="Weekly Units by SKU" sub="All stores combined — stacked by product">
          {weeklyUnitsData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyUnitsData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#1E293B" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8", paddingTop: 12 }} />
                {SKUS.map((sku, i) => (
                  <Bar
                    key={sku}
                    dataKey={sku}
                    name={SKU_LABELS[sku]}
                    stackId="a"
                    fill={SKU_COLORS[sku]}
                    radius={i === SKUS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* MTD Revenue + Units by store */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* MTD Revenue by store */}
          <Section title="MTD Revenue by Store" sub="Actual revenue from sheet">
            {revenueByStore.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">No revenue data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={revenueByStore}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#94A3B8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => fmtRev(v)}
                  />
                  <YAxis
                    type="category"
                    dataKey="store"
                    width={76}
                    tick={{ fill: "#94A3B8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number) => [fmtRevFull(v), "Revenue"]}
                    cursor={{ fill: "#1E293B" }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {revenueByStore.map((_, i) => (
                      <Cell key={i} fill={STORE_PALETTE[i % STORE_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* MTD Units by store with target */}
          <Section title="MTD Units by Store" sub="vs monthly target — click header to set">
            <div className="space-y-3">
              {unitsByStore.map((row, i) => {
                const pct = Math.min(100, row.target > 0 ? (row.units / row.target) * 100 : 0);
                return (
                  <div key={row.store}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-200 font-medium">{row.store}</span>
                      <span className="text-slate-400">{row.units} / {row.target}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: STORE_PALETTE[i % STORE_PALETTE.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* SKU Mix donut */}
        <Section title="SKU Mix — MTD" sub="Share of units sold per product across all stores">
          <div className="flex flex-wrap gap-8 items-center justify-center lg:justify-start">
            <div className="flex-shrink-0">
              {skuMix.length > 0 ? (
                <PieChart width={200} height={200}>
                  <Pie data={skuMix} cx={100} cy={100} innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {skuMix.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, n: string) => [`${v} units`, n]} />
                </PieChart>
              ) : (
                <p className="text-slate-500 text-sm py-10">No data</p>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3">
              {skuMix.map((e) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: e.color }} />
                  <div>
                    <p className="text-xs text-slate-400">{e.name}</p>
                    <p className="text-sm font-semibold text-white">{e.value} units</p>
                    <p className="text-xs text-slate-500">
                      {grandTotalUnits > 0 ? Math.round((e.value / grandTotalUnits) * 100) : 0}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Walkin conversion (shown only if walkin data exists) */}
        {hasWalkin && (
          <Section title="Walkin Conversion by SKU" sub="Total inquiries vs units sold this month">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-700">
                    <th className="pb-2 pr-4 font-medium">SKU</th>
                    <th className="pb-2 px-3 font-medium text-right">Walkins</th>
                    <th className="pb-2 px-3 font-medium text-right">Sold</th>
                    <th className="pb-2 pl-3 font-medium text-right">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {walkinData.map((row) => (
                    <tr key={row.sku} className="hover:bg-slate-700/20">
                      <td className="py-2 pr-4 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: row.color }} />
                        <span className="text-slate-200">{row.label}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">{row.walkin || "—"}</td>
                      <td className="py-2 px-3 text-right text-white font-medium">{row.sold || "—"}</td>
                      <td className="py-2 pl-3 text-right">
                        {row.walkin > 0 ? (
                          <span className={`font-semibold ${row.rate >= 50 ? "text-emerald-400" : row.rate >= 25 ? "text-amber-400" : "text-red-400"}`}>
                            {row.rate}%
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* Store detail table */}
        <Section title="Store Detail" sub="Units by week + MTD revenue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-700">
                  <th className="pb-2 pr-4 font-medium">Store</th>
                  {stores[0]?.weeks.map((w, i) => (
                    <th key={i} className="pb-2 px-2 font-medium text-right whitespace-nowrap">
                      {w.label.replace(/week\s*(\d)/i, "Wk $1").replace(/\(.*\)/, "").trim()}
                    </th>
                  ))}
                  <th className="pb-2 px-2 font-medium text-right">Total Units</th>
                  <th className="pb-2 pl-2 font-medium text-right">MTD Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {stores.map((s, i) => (
                  <tr key={s.name} className="hover:bg-slate-700/20">
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STORE_PALETTE[i % STORE_PALETTE.length] }} />
                        <span className="text-slate-200 font-medium">{s.shortName}</span>
                      </span>
                    </td>
                    {s.weeks.map((w, j) => (
                      <td key={j} className="py-2 px-2 text-right text-slate-300">
                        {w.total || "—"}
                      </td>
                    ))}
                    <td className="py-2 px-2 text-right text-indigo-400 font-semibold">{s.totalQty || "—"}</td>
                    <td className="py-2 pl-2 text-right text-emerald-400 font-semibold">
                      {s.mtdRevenue > 0 ? fmtRevFull(s.mtdRevenue) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-600 font-semibold text-right">
                  <td className="pt-3 pr-4 text-left text-slate-400">Total</td>
                  {stores[0]?.weeks.map((_, j) => (
                    <td key={j} className="pt-3 px-2 text-slate-300">
                      {stores.reduce((s, r) => s + (r.weeks[j]?.total ?? 0), 0) || "—"}
                    </td>
                  ))}
                  <td className="pt-3 px-2 text-indigo-400">{grandTotalUnits}</td>
                  <td className="pt-3 pl-2 text-emerald-400">{fmtRevFull(grandTotalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>

        {/* Weekly summary (from Store Location section) */}
        {weekSummaries.length > 0 && (
          <Section title="Weekly Revenue Summary" sub="Aggregate across all stores">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 border-b border-slate-700 text-left">
                    <th className="pb-2 pr-4 font-medium">Period</th>
                    <th className="pb-2 px-3 font-medium text-right">Units</th>
                    <th className="pb-2 pl-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {weekSummaries.map((w) => (
                    <tr key={w.label} className="hover:bg-slate-700/20">
                      <td className="py-2 pr-4 text-slate-300 capitalize">{w.label}</td>
                      <td className="py-2 px-3 text-right text-white">{w.units}</td>
                      <td className="py-2 pl-3 text-right text-emerald-400">{fmtRevFull(w.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        <p className="text-center text-xs text-slate-600 pb-6">
          Data fetched live from Google Sheets · {title}
        </p>
      </main>
    </div>
  );
}
