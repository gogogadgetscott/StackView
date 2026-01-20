"use client";

import { useState } from "react";
import { ContainerTable } from "../components/container-table";
import { StackList } from "../components/stack-card";
import { ChevronDown, ChevronRight, LayoutGrid, List } from "lucide-react";

export default function Page() {
  const [stacksExpanded, setStacksExpanded] = useState(true);
  const [containersExpanded, setContainersExpanded] = useState(true);

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-cyan-500/30">
      <div className="mx-auto max-w-full px-4 py-4 sm:px-6 sm:py-6">
        {/* Header - Compact */}
        <header className="mb-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded">Alpha</span>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-tight">StackView Control Plane</p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Stacks & Containers</h1>
          </div>
          
          {/* Status Pill - More subtle */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-[10px] font-medium text-neutral-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Docker Engine Connected
          </div>
        </header>

        {/* Desktop Layout - Split View (Side by Side) */}
        <div className="hidden lg:grid grid-cols-12 gap-6 h-[calc(100vh-120px)] overflow-hidden">
          {/* Left Column: Stacks (4/12 width) */}
          <div className="col-span-4 flex flex-col min-h-0 bg-neutral-900/10 rounded-xl border border-neutral-800/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900/40 border-b border-neutral-800/60">
              <LayoutGrid className="h-4 w-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">Stacks</h2>
              <div className="ml-auto flex gap-1.5">
                <div className="h-1 w-8 rounded-full bg-cyan-500/30"></div>
                <div className="h-1 w-2 rounded-full bg-cyan-500/10"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800 hover:scrollbar-thumb-neutral-700 transition-colors">
              <StackList />
            </div>
          </div>

          {/* Right Column: All Containers (8/12 width) */}
          <div className="col-span-8 flex flex-col min-h-0 bg-neutral-900/10 rounded-xl border border-neutral-800/40 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900/40 border-b border-neutral-800/60">
              <List className="h-4 w-4 text-purple-400" />
              <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-400">All Containers</h2>
              <div className="ml-auto flex gap-1.5">
                <div className="h-1 w-2 rounded-full bg-purple-500/10"></div>
                <div className="h-1 w-8 rounded-full bg-purple-500/30"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800 hover:scrollbar-thumb-neutral-700 transition-colors">
              <ContainerTable />
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Layout - Accordions */}
        <div className="flex flex-col gap-4 lg:hidden">
          {/* Stacks Accordion */}
          <div className={`rounded-xl border transition-all duration-300 ${stacksExpanded ? 'border-neutral-700 bg-neutral-900/40 shadow-lg shadow-cyan-500/5' : 'border-neutral-800 bg-neutral-900/20'}`}>
            <button
              onClick={() => setStacksExpanded(!stacksExpanded)}
              className={`flex w-full items-center justify-between px-4 py-3.5 transition-colors ${stacksExpanded ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/20'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${stacksExpanded ? 'bg-cyan-500/10' : 'bg-neutral-800'}`}>
                  <LayoutGrid className={`h-4 w-4 ${stacksExpanded ? 'text-cyan-400' : 'text-neutral-500'}`} />
                </div>
                <span className={`font-bold text-xs uppercase tracking-widest ${stacksExpanded ? 'text-white' : 'text-neutral-400'}`}>Stacks</span>
              </div>
              <div className={`transition-transform duration-300 ${stacksExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className={`h-5 w-5 ${stacksExpanded ? 'text-cyan-400' : 'text-neutral-600'}`} />
              </div>
            </button>
            {stacksExpanded && (
              <div className="p-4 border-t border-neutral-800/60">
                <StackList />
              </div>
            )}
          </div>

          {/* Containers Accordion */}
          <div className={`rounded-xl border transition-all duration-300 ${containersExpanded ? 'border-neutral-700 bg-neutral-900/40 shadow-lg shadow-purple-500/5' : 'border-neutral-800 bg-neutral-900/20'}`}>
            <button
              onClick={() => setContainersExpanded(!containersExpanded)}
              className={`flex w-full items-center justify-between px-4 py-3.5 transition-colors ${containersExpanded ? 'bg-neutral-800/40' : 'hover:bg-neutral-800/20'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${containersExpanded ? 'bg-purple-500/10' : 'bg-neutral-800'}`}>
                  <List className={`h-4 w-4 ${containersExpanded ? 'text-purple-400' : 'text-neutral-500'}`} />
                </div>
                <span className={`font-bold text-xs uppercase tracking-widest ${containersExpanded ? 'text-white' : 'text-neutral-400'}`}>All Containers</span>
              </div>
              <div className={`transition-transform duration-300 ${containersExpanded ? 'rotate-180' : ''}`}>
                <ChevronDown className={`h-5 w-5 ${containersExpanded ? 'text-purple-400' : 'text-neutral-600'}`} />
              </div>
            </button>
            {containersExpanded && (
              <div className="p-0 border-t border-neutral-800/60">
                <div className="p-4 pt-2">
                  <ContainerTable />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

