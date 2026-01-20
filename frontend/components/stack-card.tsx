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
      <div className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400">
        <AlertCircle className="h-3 w-3" />
        <span>Unhealthy</span>
      </div>
    );
  }
  if (stack.runningCount === total && total > 0) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 text-xs font-medium text-emerald-400">
        <CheckCircle className="h-3 w-3" />
        <span>Running</span>
      </div>
    );
  }
  if (stack.stoppedCount === total && total > 0) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-neutral-700/40 border border-neutral-600/30 px-2 py-1 text-xs font-medium text-neutral-400">
        <div className="h-2 w-2 rounded-full bg-neutral-500" />
        <span>Stopped</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2 py-1 text-xs font-medium text-yellow-400">
      <AlertTriangle className="h-3 w-3" />
      <span>Partial</span>
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
  // Calculate aggregated CPU/mem from containers
  const totalCpu = containers.reduce((sum, c) => sum + c.cpu, 0);
  const totalMem = containers.reduce((sum, c) => sum + c.mem, 0);
  const total = stack.runningCount + stack.stoppedCount;

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/60 shadow-sm transition-all hover:bg-neutral-900 hover:border-neutral-700">
      {/* Mobile Card View */}
      <button
        onClick={onToggle}
        className="flex flex-col w-full p-4 text-left sm:hidden"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              )}
            </div>
            <span className="font-bold text-neutral-100 text-base">{stack.name}</span>
          </div>
          {getStatusBadge({ stack })}
        </div>
        <div className="text-xs text-neutral-400 font-medium tracking-tight">
          Services: <span className="text-emerald-400">{stack.runningCount}</span> / {total}
          <span className="mx-1.5 text-neutral-700">·</span>
          CPU {totalCpu.toFixed(1)}%
          <span className="mx-1.5 text-neutral-700">·</span>
          Mem {totalMem.toFixed(1)}%
          <span className="mx-1.5 text-neutral-700">·</span>
          Issues: {stack.unhealthyCount > 0 ? (
            <span className="text-red-400">{stack.unhealthyCount}</span>
          ) : (
            <span className="text-neutral-500">None</span>
          )}
        </div>
      </button>

      {/* Desktop Table Row */}
      <button
        onClick={onToggle}
        className="hidden sm:grid w-full grid-cols-[32px_1.5fr_80px_110px_70px_70px_70px] items-center gap-3 px-3 py-2.5 text-sm"
      >
        {/* Expand Icon */}
        <div className="flex items-center justify-center shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          )}
        </div>

        {/* Name */}
        <div className="text-left">
          <span className="font-semibold text-neutral-100 truncate">{stack.name}</span>
        </div>

        {/* Services (running/total) */}
        <div className="text-right text-neutral-300 tabular-nums">
          <span className="text-emerald-400">{stack.runningCount}</span>
          <span className="text-neutral-500 mx-0.5">/</span>
          <span>{total}</span>
        </div>

        {/* Status */}
        <div className="flex justify-center">
          {getStatusBadge({ stack })}
        </div>

        {/* CPU */}
        <div className="text-right text-cyan-400 tabular-nums">
          {totalCpu.toFixed(1)}%
        </div>

        {/* Mem */}
        <div className="text-right text-purple-400 tabular-nums">
          {totalMem.toFixed(1)}%
        </div>

        {/* Issues */}
        <div className="flex items-center justify-center">
          {stack.unhealthyCount > 0 ? (
            <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span>{stack.unhealthyCount}</span>
            </div>
          ) : (
            <span className="text-neutral-600 text-[10px] uppercase font-bold tracking-tighter">None</span>
          )}
        </div>
      </button>

      {/* Expanded Container List */}
      {isExpanded && containers.length > 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950/40">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <tbody className="divide-y divide-neutral-800/50">
                {containers.map((container) => (
                  <tr key={container.id} className="hover:bg-neutral-800/20">
                    <td className="px-4 py-2 sm:pl-12">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 w-full">
                        <div className="flex items-center flex-1 min-w-0">
                          <span
                            className={`mr-2.5 shrink-0 inline-block h-2 w-2 rounded-full ${
                              container.status === "running"
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-neutral-600 shadow-inner"
                            }`}
                          />
                          <span className="text-sm text-neutral-200 truncate font-mono">
                            {container.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 sm:mt-0 pl-4 sm:pl-0">
                          <span className="text-[10px] uppercase font-bold text-neutral-600 tracking-widest tabular-nums">
                            {container.id.slice(0, 8)}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-cyan-400 tabular-nums bg-cyan-400/10 px-1.5 py-0.5 rounded">
                              {container.cpu.toFixed(1)}%
                            </span>
                            <span className="text-[10px] font-bold text-purple-400 tabular-nums bg-purple-400/10 px-1.5 py-0.5 rounded">
                              {container.mem.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isExpanded && containers.length === 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950/50 px-6 py-4 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-neutral-800 border border-neutral-700 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
            <div className="h-1.5 w-1.5 rounded-full bg-neutral-600" />
            <span>Empty Stack</span>
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
        console.error("Failed to fetch stacks:", err);
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
      <div className="flex items-center justify-center py-12 text-neutral-500">
        Loading stacks...
      </div>
    );
  }

  if (stacks.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-neutral-600" />
        <h3 className="mt-3 text-sm font-medium text-neutral-300">No stacks found</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Make sure STACKVIEW_STACK_ROOTS is set to scan your compose directories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
        <div className="min-w-[600px] sm:min-w-0">
          {/* Column Headers */}
          <div className="hidden sm:grid grid-cols-[32px_1.5fr_80px_110px_70px_70px_70px] items-center gap-3 px-3 py-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-800/50 mb-2">
            <div className="w-4"></div> {/* Expand icon space */}
            <div>Name</div>
            <div className="text-right">Services</div>
            <div className="text-center">Status</div>
            <div className="text-right">CPU</div>
            <div className="text-right">Mem</div>
            <div className="text-center">Issues</div>
          </div>

          {/* Stack Cards */}
          <div className="space-y-2">
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
        </div>
      </div>
    </div>
  );
}
