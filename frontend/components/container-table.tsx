"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
  ExpandedState,
} from "@tanstack/react-table";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";
import { 
  Play, 
  Square, 
  RefreshCw, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  Folder, 
  Box, 
  Cpu, 
  HardDrive,
  MoreHorizontal,
  ExternalLink,
  Activity,
  Terminal,
  BarChart3
} from "lucide-react";

import { ContainerRow, StatPoint, Stack } from "../lib/types";
import { ContainerExpandedRow } from "./container-expanded-row";
import { API_BASE, WS_STATS_URL as WS_URL } from "../lib/api-config";

// --- Types for Unified Table ---

type RowType = "stack" | "container";

interface UnifiedRow {
  id: string;
  type: RowType;
  name: string;
  status: string;
  cpu: number;
  mem: number;
  stackName: string;
  containerId?: string; // Only for containers
  subRows?: UnifiedRow[];
  originalData?: any;
}

// --- Hooks ---

function useUnifiedData() {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [allContainers, setAllContainers] = useState<ContainerRow[]>([]);
  const [stats, setStats] = useState<Record<string, { cpu: number; mem: number; spark: StatPoint[] }>>({});
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stacksRes, containersRes] = await Promise.all([
          fetch(`${API_BASE}/api/stacks`),
          fetch(`${API_BASE}/api/containers`)
        ]);
        
        if (stacksRes.ok && containersRes.ok) {
          setStacks(await stacksRes.json());
          setAllContainers(await containersRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Real-time Stats Stream
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      socket.send(JSON.stringify({ containerIds: [], intervalMs: 1000 }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.containerId) return;

      setStats((prev) => {
        const currentSpark = prev[data.containerId]?.spark || [];
        const nextSpark = [...currentSpark, { ts: data.ts, cpu: data.cpuPercent, mem: data.memPercent }].slice(-20);
        return {
          ...prev,
          [data.containerId]: {
            cpu: data.cpuPercent,
            mem: data.memPercent,
            spark: nextSpark,
          }
        };
      });
    };

    return () => socket.close();
  }, []);

  // Build Hierarchical Rows
  const rows = useMemo(() => {
    return stacks.map((stack): UnifiedRow => {
      const stackContainers = allContainers.filter(c => c.stack === stack.name);
      
      const containerSubRows = stackContainers.map((c): UnifiedRow => {
        const liveStats = stats[c.id] || { cpu: 0, mem: 0, spark: [] };
        return {
          id: `container-${c.id}`,
          type: "container",
          name: c.name.replace("/", ""),
          status: c.status,
          cpu: liveStats.cpu,
          mem: liveStats.mem,
          stackName: stack.name,
          containerId: c.id,
          originalData: { ...c, spark: liveStats.spark }
        };
      });

      return {
        id: `stack-${stack.name}`,
        type: "stack",
        name: stack.name,
        status: stack.runningCount > 0 ? "running" : "stopped",
        cpu: containerSubRows.reduce((acc, c) => acc + c.cpu, 0),
        mem: containerSubRows.reduce((acc, c) => acc + c.mem, 0),
        stackName: stack.name,
        subRows: containerSubRows,
        originalData: stack
      };
    });
  }, [stacks, allContainers, stats]);

  return { rows, loading };
}

// --- Components ---

function StatusBadge({ status, type }: { status: string; type: RowType }) {
  const isRunning = status === "running" || status === "Operational" || status.startsWith("Up");
  
  if (isRunning) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
        <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
        Running
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 rounded-lg text-[10px] font-black uppercase tracking-wider border border-surface-200 dark:border-surface-700">
      <span className="h-1.5 w-1.5 bg-surface-300 dark:bg-surface-600 rounded-full" />
      Stopped
    </div>
  );
}

function Sparkline({ points }: { points: StatPoint[] }) {
  if (!points?.length) return <div className="h-8 w-24 flex items-center justify-center text-[9px] font-black text-surface-300 dark:text-surface-700 uppercase tracking-widest">Awaiting...</div>;
  return (
    <div className="h-8 w-24 opacity-90">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={points}>
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="cpu" stroke="#2563eb" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const EXPANDED_STORAGE_KEY = "stackview-expanded-stacks";

export function ContainerTable() {
  const { rows, loading } = useUnifiedData();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>(() => {
    // Restore expanded state from localStorage on initial load
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(EXPANDED_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.warn("Failed to restore expanded state:", e);
      }
    }
    return {};
  });
  const [globalFilter, setGlobalFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "running" | "stopped">("all");

  const handleContainerAction = async (containerId: string, action: "start" | "stop" | "restart") => {
    try {
      const res = await fetch(`${API_BASE}/api/containers/${containerId}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        console.error(`Failed to ${action} container:`, errorData);
        alert(`Failed to ${action} container`);
        return;
      }
      const result = await res.json();
      console.log(`Container ${action} successful:`, result);
      // Optionally refresh data or update UI state
    } catch (err) {
      console.error(`Error performing ${action} on container:`, err);
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Persist expanded state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(expanded));
    } catch (e) {
      console.warn("Failed to save expanded state:", e);
    }
  }, [expanded]);

  const columns = useMemo<ColumnDef<UnifiedRow>[]>(
    () => [
      {
        id: "expander",
        header: "",
        cell: ({ row }) => {
          if (row.original.type === "container") return null;
          return (
            <button
              onClick={() => row.toggleExpanded()}
              className={`p-2 rounded-xl transition-all duration-300 ${row.getIsExpanded() ? "bg-brand-600 text-white shadow-lg shadow-brand-600/20 rotate-90" : "text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          );
        },
        size: 50,
      },
      {
        accessorKey: "name",
        header: "Entity Name",
        cell: ({ row }) => (
          <div className={`flex items-center gap-4 ${row.original.type === "container" ? "pl-8" : ""}`}>
            {row.original.type === "stack" ? (
              <div className="p-3 bg-brand-500/10 dark:bg-brand-500/10 rounded-2xl text-brand-600 dark:text-brand-400 border border-brand-500/10">
                <Folder className="h-5 w-5" />
              </div>
            ) : (
              <div className="p-2.5 bg-surface-100 dark:bg-surface-800 rounded-xl text-surface-400 border border-surface-200 dark:border-surface-700">
                <Box className="h-4.5 w-4.5" />
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className={`text-[15px] font-black tracking-tight ${row.original.type === "stack" ? "text-surface-950 dark:text-white" : "text-surface-700 dark:text-surface-200"}`}>
                {row.original.name}
              </span>
              {row.original.type === "container" && (
                <div className="flex items-center gap-2">
                   <div className="px-1.5 py-0.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded text-[9px] font-bold text-surface-400 tracking-wider">
                     ID: {row.original.containerId?.slice(0, 12)}
                   </div>
                   <div className="h-1 w-1 bg-surface-300 rounded-full" />
                   <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
                     IMAGE: {row.original.originalData?.image?.split('/').pop()?.split(':')[0] || 'unknown'}
                   </span>
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Health Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} type={row.original.type} />,
      },
      {
        accessorKey: "cpu",
        header: "Live Performance",
        cell: ({ row }) => (
          <div className="flex items-center gap-6">
            {row.original.type === "container" && <Sparkline points={row.original.originalData.spark} />}
            <div className="flex gap-6">
              <div className="flex flex-col gap-0.5 min-w-[50px]">
                <div className="flex items-center gap-1 text-[9px] font-black text-surface-400 uppercase tracking-widest">
                  <Cpu className="h-3 w-3" />
                  CPU
                </div>
                <span className={`text-sm font-black transition-colors ${row.original.cpu > 50 ? 'text-amber-500' : 'text-surface-700 dark:text-surface-200'}`}>
                  {row.original.cpu.toFixed(1)}%
                </span>
              </div>
              <div className="flex flex-col gap-0.5 min-w-[50px]">
                <div className="flex items-center gap-1 text-[9px] font-black text-surface-400 uppercase tracking-widest">
                  <BarChart3 className="h-3 w-3" />
                  MEM
                </div>
                <span className="text-sm font-black text-surface-700 dark:text-surface-200">
                  {row.original.mem.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Operations",
        cell: ({ row }) => {
          if (row.original.type === "stack") return (
             <button className="flex items-center gap-2 px-3 py-1.5 bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-xl text-[11px] font-black uppercase tracking-wider text-surface-500 hover:text-brand-600 hover:border-brand-500/30 transition-all">
               Deploy
               <ChevronRight className="h-3 w-3" />
             </button>
          );
          const isRunning = row.original.status === "running" || row.original.status.startsWith("Up");
          return (
            <div className="flex items-center gap-1.5">
              {isRunning ? (
                <button 
                  onClick={() => handleContainerAction(row.original.containerId!, "stop")}
                  title="Stop" 
                  className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-surface-400 hover:text-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-500/20 shadow-sm"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button 
                  onClick={() => handleContainerAction(row.original.containerId!, "start")}
                  title="Start" 
                  className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-surface-400 hover:text-emerald-500 rounded-xl transition-all border border-transparent hover:border-emerald-500/20 shadow-sm"
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
              )}
              <button 
                onClick={() => handleContainerAction(row.original.containerId!, "restart")}
                title="Restart" 
                className="p-2.5 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-surface-400 hover:text-brand-500 rounded-xl transition-all border border-transparent hover:border-brand-500/20 shadow-sm"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-surface-200 dark:bg-surface-800 mx-1" />
              <button 
                onClick={() => row.toggleExpanded()}
                className={`p-2.5 rounded-xl transition-all duration-300 ${row.getIsExpanded() ? "bg-surface-950 dark:bg-white text-white dark:text-surface-950 shadow-lg" : "text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"}`}
              >
                <Terminal className="h-4 w-4" />
              </button>
            </div>
          );
        },
      }
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, expanded, globalFilter },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getSubRows: (row) => row.subRows,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Apply Tab Filtering
  useEffect(() => {
    if (activeTab === "all") {
      table.getColumn("status")?.setFilterValue(undefined);
    } else if (activeTab === "running") {
      table.getColumn("status")?.setFilterValue("running");
    } else if (activeTab === "stopped") {
      table.getColumn("status")?.setFilterValue("exited");
    }
  }, [activeTab, table]);

  if (loading && rows.length === 0) {
    return (
      <div className="p-24 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Activity className="h-12 w-12 text-brand-600 animate-spin" />
        </div>
        <div className="space-y-1 text-center">
            <h4 className="text-lg font-black text-surface-900 dark:text-white uppercase tracking-widest">Warping Interface...</h4>
            <p className="text-surface-400 text-sm font-medium">Synchronizing Docker socket events and metrics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full flex-1">
      {/* Search and Tabs */}
      <div className="p-8 border-b border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-6 bg-surface-50/30 dark:bg-surface-900/10">
        <div className="flex items-center bg-white dark:bg-surface-950 border border-surface-200 dark:border-surface-800 rounded-[1.25rem] px-5 py-3 w-full max-w-lg focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500/40 transition-all shadow-sm">
          <Search className="h-5 w-5 text-surface-400 mr-4" />
          <input
            placeholder="Search stacks, services, or container IDs..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-sm font-bold text-surface-700 dark:text-surface-200 w-full placeholder:text-surface-400 placeholder:font-medium"
          />
        </div>

        <div className="flex p-1.5 bg-surface-100 dark:bg-surface-950 border border-surface-200/50 dark:border-surface-800 rounded-2xl shadow-inner">
          {["all", "running", "stopped"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                activeTab === tab 
                  ? "bg-white dark:bg-brand-600 text-brand-600 dark:text-white shadow-xl shadow-brand-600/10" 
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-surface-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className={`text-left px-10 py-5 bg-surface-50/50 dark:bg-surface-900/50 text-[11px] font-black uppercase tracking-[0.2em] text-surface-400 border-b border-surface-100 dark:border-surface-800 ${header.id === 'name' ? 'w-full' : ''}`}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-surface-100 dark:divide-surface-800/50">
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className={`hover:bg-brand-50/30 dark:hover:bg-brand-900/10 transition-colors group relative ${row.original.type === "stack" ? "bg-white dark:bg-surface-900" : "bg-surface-50/10 dark:bg-surface-950/20"}`}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-10 py-6 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && row.original.type === "container" && (
                   <tr key={`${row.id}-details`}>
                     <td colSpan={columns.length} className="bg-surface-50/50 dark:bg-surface-950/50 p-0 overflow-hidden">
                        <div className="px-12 py-10 border-l-4 border-brand-600 animate-in slide-in-from-top-4 duration-500">
                          <ContainerExpandedRow
                            containerId={row.original.containerId!}
                            containerName={row.original.name}
                          />
                        </div>
                     </td>
                   </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {table.getRowModel().rows.length === 0 && (
          <div className="py-32 flex flex-col items-center justify-center text-center">
            <div className="p-8 bg-surface-50 dark:bg-surface-950 rounded-[3rem] mb-8 border border-surface-100 dark:border-surface-800 shadow-xl shadow-surface-500/5 group">
              <Search className="h-14 w-14 text-surface-200 dark:text-surface-800 group-hover:scale-110 group-hover:text-brand-500 transition-all duration-500" />
            </div>
            <h3 className="text-2xl font-black text-surface-950 dark:text-white mb-3">No Services Found</h3>
            <p className="text-surface-400 max-w-[320px] font-medium leading-relaxed">
              We couldn't find any resources matching your search query or filters. Try adjusting your scope.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-8 border-t border-surface-100 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-900/10 mt-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
           <div className="px-3 py-1 bg-brand-600/10 text-brand-600 text-[10px] font-black uppercase rounded-full border border-brand-600/20">
             LIVE DATA
           </div>
           <span className="text-[11px] font-black text-surface-400 uppercase tracking-widest">
             Monitoring {table.getRowModel().rows.length} Active System Entities
           </span>
        </div>
        <div className="flex gap-3">
           <button disabled className="px-5 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-surface-300 dark:text-surface-700 opacity-50 cursor-not-allowed">Previous Page</button>
           <button disabled className="px-5 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-surface-300 dark:text-surface-700 opacity-50 cursor-not-allowed">Next Page</button>
        </div>
      </div>
    </div>
  );
}


