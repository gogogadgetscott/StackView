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
      {/* Compact Stack Row */}
      <button
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2.5 text-sm"
      >
        {/* Expand Icon */}
        <div className="flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
          )}
        </div>

        {/* Name */}
        <div className="flex items-center gap-2 text-left">
          <span className="font-medium text-neutral-100 truncate">{stack.name}</span>
        </div>

        {/* Services (running/total) */}
        <div className="text-right text-neutral-300 tabular-nums min-w-[60px]">
          <span className="text-emerald-400">{stack.runningCount}</span>
          <span className="text-neutral-500">/</span>
          <span>{total}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 min-w-[90px]">
          {getStatusBadge({ stack })}
        </div>

        {/* CPU */}
        <div className="text-right text-cyan-400 tabular-nums min-w-[60px]">
          {totalCpu.toFixed(1)}%
        </div>

        {/* Mem */}
        <div className="text-right text-purple-400 tabular-nums min-w-[60px]">
          {totalMem.toFixed(1)}%
        </div>

        {/* Issues */}
        <div className="flex items-center justify-center min-w-[50px]">
          {stack.unhealthyCount > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span>{stack.unhealthyCount}</span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded Container List */}
      {isExpanded && containers.length > 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950/50">
          <table className="min-w-full">
            <tbody className="divide-y divide-neutral-800/50">
              {containers.map((container) => (
                <tr key={container.id} className="hover:bg-neutral-800/20">
                  <td className="px-6 py-2 pl-12">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${
                        container.status === "running"
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-neutral-500"
                      }`}
                    />
                    <span className="text-sm text-neutral-200">
                      {container.name}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-neutral-400">
                    {container.id.slice(0, 12)}
                  </td>
                  <td className="px-4 py-2 text-sm text-cyan-300">
                    CPU {container.cpu.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 text-sm text-purple-300">
                    Mem {container.mem.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isExpanded && containers.length === 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950/50 px-6 py-3 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-neutral-700/30 border border-neutral-600/30 px-3 py-1.5 text-xs font-medium text-neutral-400">
            <div className="h-2 w-2 rounded-full bg-neutral-500" />
            <span>Empty</span>
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
      {/* Column Headers */}
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-3 px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
        <div className="w-3.5"></div> {/* Expand icon space */}
        <div>Name</div>
        <div className="text-right min-w-[60px]">Services</div>
        <div className="min-w-[90px]">Status</div>
        <div className="text-right min-w-[60px]">CPU</div>
        <div className="text-right min-w-[60px]">Mem</div>
        <div className="text-center min-w-[50px]">Issues</div>
      </div>

      {/* Stack Cards */}
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
