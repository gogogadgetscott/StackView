"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Folder, AlertCircle } from "lucide-react";
import { Stack, ContainerRow } from "../lib/types";

type StackWithContainers = Stack & {
  containers: ContainerRow[];
};

function StackStatusBadge({ stack }: { stack: Stack }) {
  const total = stack.runningCount + stack.stoppedCount;
  if (stack.unhealthyCount > 0) {
    return (
      <span className="flex items-center gap-1 rounded bg-red-500/20 px-2 py-1 text-xs text-red-400">
        <AlertCircle className="h-3 w-3" />
        {stack.unhealthyCount} unhealthy
      </span>
    );
  }
  if (stack.runningCount === total && total > 0) {
    return (
      <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">
        All running
      </span>
    );
  }
  if (stack.stoppedCount === total && total > 0) {
    return (
      <span className="rounded bg-neutral-500/20 px-2 py-1 text-xs text-neutral-400">
        Stopped
      </span>
    );
  }
  return (
    <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
      {stack.runningCount}/{total} running
    </span>
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

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg">
      {/* Stack Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-800/40"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-neutral-400" />
          )}
          <Folder className="h-5 w-5 text-cyan-400" />
          <div className="text-left">
            <div className="font-medium text-neutral-100">{stack.name}</div>
            <div className="text-xs text-neutral-500">
              {stack.services.length} service{stack.services.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StackStatusBadge stack={stack} />
          <div className="flex gap-4 text-sm">
            <span className="text-cyan-300">
              CPU {totalCpu.toFixed(1)}%
            </span>
            <span className="text-purple-300">
              Mem {totalMem.toFixed(1)}%
            </span>
          </div>
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
        <div className="border-t border-neutral-800 bg-neutral-950/50 px-6 py-4 text-center text-sm text-neutral-500">
          No containers running
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
        const res = await fetch("http://localhost:8080/api/stacks");
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
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <Folder className="mx-auto h-12 w-12 text-neutral-600" />
        <h3 className="mt-4 text-lg font-medium text-neutral-200">No stacks found</h3>
        <p className="mt-2 text-sm text-neutral-500">
          Make sure STACKVIEW_STACK_ROOTS is set to scan your compose directories.
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
