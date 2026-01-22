"use client";

import { FlatContainerTable } from "../../components/flat-container-table";
import { 
  ChevronRight, 
  Home, 
  Plus, 
  RefreshCcw,
  Box
} from "lucide-react";
import { useEffect, useState } from "react";
import { checkBackendStatus } from "../../lib/api-config";

function Breadcrumbs() {
  return (
    <nav className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-surface-400 mb-8">
      <div className="flex items-center gap-2 hover:text-brand-600 transition-colors cursor-pointer group">
        <div className="p-1.5 bg-surface-100 dark:bg-surface-900 rounded-lg group-hover:bg-brand-50 transition-all">
          <Home className="h-3.5 w-3.5" />
        </div>
        <span>StackView</span>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-surface-300" />
      <span className="text-surface-900 dark:text-surface-100">Containers</span>
    </nav>
  );
}

function BackendStatusPill() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const status = await checkBackendStatus();
      setIsOnline(status);
    };
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null) return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-100 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 animate-pulse">
        <div className="h-2 w-2 rounded-full bg-surface-300" />
        <span className="text-[10px] font-black uppercase tracking-wider text-surface-400">Syncing...</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-500 ${
      isOnline 
        ? "bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" 
        : "bg-rose-50/50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20"
    }`}>
      <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"}`} />
      {isOnline ? "System Operational" : "Backend Offline"}
    </div>
  );
}

export default function ContainersPage() {
  return (
    <div className="p-6 lg:p-8 w-full flex-1 flex flex-col">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <Breadcrumbs />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-surface-950 dark:text-white">
                  Containers
                </h1>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 text-brand-600 rounded-xl border border-brand-500/20">
                  <Box className="h-4 w-4" />
                  <span className="text-[11px] font-black uppercase tracking-wider">All Instances</span>
                </div>
              </div>
              <p className="text-surface-500 dark:text-surface-400 text-lg font-medium max-w-2xl">
                View and manage all containers directly without stack hierarchy.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <BackendStatusPill />
            <div className="h-6 w-px bg-surface-200 dark:bg-surface-800 mx-1 hidden sm:block" />
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-[13px] font-bold text-surface-600 dark:text-surface-300 hover:border-brand-500/50 transition-all shadow-sm active:scale-95 group">
              <RefreshCcw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
              Refresh
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 rounded-xl text-[13px] font-bold text-white hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/25 active:scale-95">
              <Plus className="h-4 w-4" />
              New Container
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
         {/* Table Section */}
        <section className="flex-1 flex flex-col bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl overflow-hidden shadow-xl shadow-surface-500/5 transition-all">
          <FlatContainerTable />
        </section>
      </div>
    </div>
  );
}
