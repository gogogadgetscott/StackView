"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { Stack, ContainerRow } from "../lib/types";
import { Folder } from "lucide-react";

import { API_BASE } from "../lib/api-config";

function StackStatusBadge({ stack }: { stack: Stack }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-neutral-950/50 px-2 py-1 text-xs font-medium border border-neutral-800">
      {getStackStatusIcon({ stack })}
      <StackStatusText stack={stack} />
    </div>
  );
}

function getStackStatusIcon({ stack }: { stack: Stack }) {
  const total = stack.runningCount + stack.stoppedCount;
  
  if (stack.unhealthyCount > 0) {
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  }
  if (stack.runningCount === total && total > 0) {
    return <CheckCircle className="h-4 w-4 text-emerald-400" />;
  }
  if (stack.stoppedCount === total && total > 0) {
    return <div className="h-2 w-2 rounded-full bg-neutral-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
}

function StackStatusText({ stack }: { stack: Stack }) {
  const total = stack.runningCount + stack.stoppedCount;
  
  if (stack.unhealthyCount > 0) {
    return <span className="text-red-400">Unhealthy</span>;
  }
  if (stack.runningCount === total && total > 0) {
    return <span className="text-emerald-400">Running</span>;
  }
  if (stack.stoppedCount === total && total > 0) {
    return <span className="text-neutral-400">Stopped</span>;
  }
  return <span className="text-yellow-400">Partial</span>;
}

function getStatusBadge({ stack }: { stack: Stack }) {
  const total = stack.runningCount + stack.stoppedCount;
  
  if (stack.unhealthyCount > 0) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)] backdrop-blur-md">
        <AlertCircle className="h-3 w-3" />
        <span>Action Needed</span>
      </div>
    );
  }
  if (stack.runningCount === total && total > 0) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-md">
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>Operational</span>
      </div>
    );
  }
  if (stack.stoppedCount === total && total > 0) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-neutral-500 backdrop-blur-md">
        <div className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
        <span>Inactive</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)] backdrop-blur-md">
      <AlertTriangle className="h-3 w-3" />
      <span>Degraded</span>
    </div>
  );
}

export function StackCard({
  stack,
  containers,
  isExpanded,
  onToggle,
}: {
  stack: Stack;
  containers: ContainerRow[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalCpu = containers.reduce((sum, c) => sum + c.cpu, 0);
  const totalMem = containers.reduce((sum, c) => sum + c.mem, 0);
  const total = stack.runningCount + stack.stoppedCount;

  return (
    <div className={`group relative rounded-3xl border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-white/10 bg-white/[0.04] shadow-2xl' : 'border-white/[0.05] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.03]'}`}>
      {/* Sidebar Compact View (Used for both Desktop and Mobile as it's robust) */}
      <button
        onClick={onToggle}
        className={`flex w-full flex-col gap-4 p-5 text-left transition-all duration-300 ${isExpanded ? 'bg-white/[0.02]' : ''}`}
      >
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 p-1.5 rounded-xl transition-all duration-500 ${isExpanded ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-white/5 text-neutral-600'}`}>
              <Folder className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`font-black text-sm tracking-tight transition-colors duration-500 truncate ${isExpanded ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                {stack.name}
              </span>
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">
                {stack.runningCount} / {total} Services
              </span>
            </div>
          </div>
          <div className="shrink-0">
            {getStatusBadge({ stack })}
          </div>
        </div>

        {/* Stats Strip */}
        <div className="flex items-center gap-4 bg-black/20 rounded-2xl px-4 py-2.5 border border-white/[0.03] shadow-inner">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-1">CPU</span>
            <span className={`text-[11px] font-black tabular-nums leading-none ${totalCpu > 0 ? 'text-cyan-400' : 'text-neutral-700'}`}>
              {totalCpu.toFixed(1)}%
            </span>
          </div>
          <div className="h-4 w-px bg-white/5" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-1">RAM</span>
            <span className={`text-[11px] font-black tabular-nums leading-none ${totalMem > 0 ? 'text-purple-400' : 'text-neutral-700'}`}>
              {totalMem.toFixed(1)}%
            </span>
          </div>
          <div className="ml-auto">
             <div className={`p-1 rounded-lg transition-transform duration-500 ${isExpanded ? 'rotate-180 bg-white/5' : 'bg-transparent'}`}>
                <ChevronDown className={`h-3.5 w-3.5 transition-colors ${isExpanded ? 'text-cyan-400' : 'text-neutral-700'}`} />
             </div>
          </div>
        </div>
      </button>

      {/* Expanded Container List - Glass Style */}
      {isExpanded && containers.length > 0 && (
        <div className="border-t border-white/[0.05] bg-black/20">
          <table className="min-w-full">
            <tbody className="divide-y divide-white/[0.03]">
              {containers.map((container) => (
                <tr key={container.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`shrink-0 h-1.5 w-1.5 rounded-full ${
                            container.status === "running"
                              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                              : "bg-neutral-700"
                          }`}
                        />
                        <span className="text-[11px] font-bold text-neutral-400 truncate tracking-tight group-hover:text-neutral-200 transition-colors">
                          {container.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[9px] font-black text-cyan-400/60 tabular-nums bg-cyan-400/5 px-2 py-0.5 rounded-full border border-cyan-400/10">
                          {container.cpu.toFixed(0)}%
                        </span>
                        <span className="text-[9px] font-black text-purple-400/60 tabular-nums bg-purple-400/5 px-2 py-0.5 rounded-full border border-purple-400/10">
                          {container.mem.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isExpanded && containers.length === 0 && (
        <div className="border-t border-white/[0.05] bg-black/20 px-6 py-6 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/[0.05] px-4 py-2 shadow-inner">
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">No telemetry data</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function StackList() {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [containersByStack, setContainersByStack] = useState<Record<string, ContainerRow[]>>({});
  const [expandedStacks, setExpandedStacks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch stacks from API
  useEffect(() => {
    const fetchStacks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/stacks`);
        if (res.ok) {
          const data = await res.json();
          setStacks(data || []);
        }
      } catch (err) {
        // Suppress noisy console errors for network failures (backend down)
        // Only log if it's not a standard fetch failure
        if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
          console.error("API Error (Stacks):", err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStacks();
    const interval = setInterval(fetchStacks, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleStack = (stackName: string) => {
    setExpandedStacks((prev) => {
      const next = new Set(prev);
      if (next.has(stackName)) {
        next.delete(stackName);
      } else {
        next.add(stackName);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-6 w-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-600">Synchronizing...</span>
      </div>
    );
  }

  if (stacks.length === 0) {
    return (
      <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.02] p-10 text-center backdrop-blur-xl">
        <AlertCircle className="mx-auto h-12 w-12 text-neutral-800" />
        <h3 className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-400">Environment Empty</h3>
        <p className="mt-2 text-[10px] font-bold text-neutral-600 leading-relaxed max-w-[180px] mx-auto">
          Ensure STACKVIEW_STACK_ROOTS is correctly configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stacks.map((stack) => (
        <StackCard
          key={stack.name}
          stack={stack}
          containers={containersByStack[stack.name] || []}
          isExpanded={expandedStacks.has(stack.name)}
          onToggle={() => toggleStack(stack.name)}
        />
      ))}
    </div>
  );
}
