"use client";

import { ContainerTable } from "../components/container-table";
import { StackList } from "../components/stack-card";
import { ChevronDown, ChevronRight, LayoutGrid, List, Activity, Globe, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { checkBackendStatus } from "../lib/api-config";

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

  if (isOnline === null) return null;

  return (
    <div className={`flex items-center gap-3 self-start sm:self-auto rounded-2xl border px-5 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-500 shadow-2xl backdrop-blur-xl ${
      isOnline 
        ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
        : "border-red-500/20 bg-red-500/5 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
    }`}>
      <span className="relative flex h-2 w-2">
        {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? "bg-emerald-500" : "bg-red-500"} shadow-sm`}></span>
      </span>
      <span>{isOnline ? "Operational" : "Backend Offline"}</span>
    </div>
  );
}

export default function Page() {
  const [stacksExpanded, setStacksExpanded] = useState(true);
  const [containersExpanded, setContainersExpanded] = useState(true);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-cyan-500/30 font-sans relative overflow-hidden">
      {/* Premium Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
      </div>

      <div className="mx-auto max-w-full px-4 py-6 sm:px-10 sm:py-10 relative z-10">
        {/* Header - Refined Glass */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.1)]">Alpha</span>
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] opacity-80">StackView Control Plane</p>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white sm:text-5xl lg:text-6xl bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
              Stacks & Containers
            </h1>
          </div>
          
          <BackendStatusPill />
        </header>

        {/* Desktop Layout - Glass Split View */}
        <div className="hidden lg:grid grid-cols-12 gap-10 h-[calc(100vh-200px)]">
          {/* Left Column: Stacks (Sidebar Style) */}
          <div className="col-span-3 flex flex-col min-h-0 bg-white/[0.02] rounded-[2rem] border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-4 px-8 py-6 bg-white/[0.02] border-b border-white/[0.05]">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <LayoutGrid className="h-4.5 w-4.5 text-cyan-400" />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400">Stacks</h2>
              <div className="ml-auto flex gap-1.5 opacity-40">
                <div className="h-1 w-8 rounded-full bg-cyan-500"></div>
                <div className="h-1 w-2 rounded-full bg-white/20"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 transition-all">
              <StackList />
            </div>
          </div>

          {/* Right Column: All Containers (Main View) */}
          <div className="col-span-9 flex flex-col min-h-0 bg-white/[0.02] rounded-[2rem] border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-4 px-8 py-6 bg-white/[0.02] border-b border-white/[0.05]">
              <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                <List className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-400">Inventory</h2>
              <div className="ml-auto flex gap-1.5 opacity-40">
                <div className="h-1 w-2 rounded-full bg-white/20"></div>
                <div className="h-1 w-8 rounded-full bg-purple-500"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 transition-all">
              <ContainerTable />
            </div>
          </div>
        </div>

        {/* Mobile Layout - Glass Accordions */}
        <div className="flex flex-col gap-6 lg:hidden">
          {stacksExpanded && (
            <div className="rounded-[2.5rem] border border-white/[0.1] bg-white/[0.02] p-6 backdrop-blur-3xl shadow-2xl">
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                    <LayoutGrid className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h2 className="font-black text-xs uppercase tracking-[0.3em] text-white">Stacks</h2>
                </div>
                <button 
                  onClick={() => setStacksExpanded(false)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <ChevronDown className="h-5 w-5 text-neutral-500" />
                </button>
              </div>
              <StackList />
            </div>
          )}

          {!stacksExpanded && (
             <button 
               onClick={() => setStacksExpanded(true)}
               className="rounded-full border border-white/[0.08] bg-white/[0.02] px-8 py-4 flex items-center justify-between group hover:bg-white/5 transition-all backdrop-blur-xl"
             >
               <span className="font-black text-[10px] uppercase tracking-[0.3em] text-neutral-400 group-hover:text-white">View Stacks</span>
               <ChevronRight className="h-5 w-5 text-neutral-700 group-hover:text-cyan-400 transition-colors" />
             </button>
          )}

          <div className="rounded-[2.5rem] border border-white/[0.1] bg-white/[0.02] p-6 backdrop-blur-3xl shadow-2xl">
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="p-2.5 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                <List className="h-5 w-5 text-purple-400" />
              </div>
              <h2 className="font-black text-xs uppercase tracking-[0.3em] text-white">Containers</h2>
            </div>
            <ContainerTable />
          </div>
        </div>
      </div>
    </main>
  );
}

