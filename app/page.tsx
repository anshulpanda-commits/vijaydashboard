import { fetchSalesData } from "@/lib/sheets";
import Dashboard from "@/components/Dashboard";

// Revalidate the page every hour so Vercel refreshes it automatically
export const revalidate = 3600;

export default async function Home() {
  let data;
  let errorMessage: string | null = null;

  try {
    data = await fetchSalesData();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error fetching data.";
  }

  if (errorMessage || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-lg bg-slate-800 border border-red-500/30 rounded-2xl p-8 text-center">
          <h1 className="text-white text-xl font-semibold mb-3">Could not load dashboard</h1>
          <p className="text-slate-400 text-sm mb-5">{errorMessage}</p>
          <div className="bg-slate-900 rounded-xl p-4 text-left text-xs text-slate-400 space-y-2">
            <p className="font-medium text-slate-300">To fix this:</p>
            <p>1. Open your Google Sheet</p>
            <p>2. Click <strong className="text-white">Share</strong></p>
            <p>3. Change access to <strong className="text-white">"Anyone with the link"</strong> → <strong className="text-white">Viewer</strong></p>
            <p>4. Click <strong className="text-white">Done</strong> and refresh this page</p>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard data={data} />;
}
