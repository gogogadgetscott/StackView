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
} from "@tanstack/react-table";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Play, Square, RefreshCw, StickyNote, ChevronRight, ChevronDown, Search, MoreHorizontal } from "lucide-react";

import { ContainerRow, StatPoint } from "../lib/types";
import { ContainerExpandedRow } from "./container-expanded-row";
import { TagInput, TagBadge } from "./tag-input";

import { API_BASE, WS_STATS_URL as WS_URL } from "../lib/api-config";

function useStatsStream(containerIds: string[]) {
  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [tagMap, setTagMap] = useState<Record<string, string[]>>({});
  const sparkRef = useRef<Record<string, StatPoint[]>>({});

  useEffect(() => {
    // Fetch all container tags once
    fetch(`${API_BASE}/api/containers/tags`)
      .then((res) => res.json())
      .then((data) => setTagMap(data))
      .catch((err) => {
        if (!(err instanceof TypeError && err.message === 'Failed to fetch')) {
          console.error("API Error (Tags):", err);
        }
      });
  }, []);

  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      socket.send(JSON.stringify({ containerIds, intervalMs: 1000 }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as any;
      if (!data.containerId) return;

      const nextSpark = { ...sparkRef.current };
      const points = nextSpark[data.containerId] ?? [];
      const trimmed = [...points, { ts: data.ts, cpu: data.cpuPercent, mem: data.memPercent }].slice(-30);
      nextSpark[data.containerId] = trimmed;
      sparkRef.current = nextSpark;

      setRows((prev) => {
        const existing = prev.find((r) => r.id === data.containerId);
        const base: ContainerRow = existing ?? {
          id: data.containerId,
          name: data.name?.replace("/", "") ?? data.containerId.slice(0, 12),
          stack: data.stackName || "unassigned",
          status: "running",
          ports: [],
          note: "",
          tags: tagMap[data.containerId] ?? [],
          spark: trimmed,
          cpu: data.cpuPercent,
          mem: data.memPercent,
        };
        
        // Update existing row or add new one
        const updatedRow = { 
          ...base, 
          cpu: data.cpuPercent, 
          mem: data.memPercent, 
          spark: trimmed, 
          stack: data.stackName || base.stack 
        };

        const index = prev.findIndex(r => r.id === data.containerId);
        if (index >= 0) {
          const newRows = [...prev];
          newRows[index] = updatedRow;
          return newRows;
        } else {
          return [...prev, updatedRow];
        }
      });
    };

    socket.onerror = (err) => {
      // WebSocket errors are often silent in the UI anyway, but let's avoid console noise
      // if it's just a connection failure during shutdown
    };
    return () => socket.close();
  }, [containerIds, tagMap]);

  return rows;
}

function ContainerCard({ row, onTagChange, allSuggestions }: { row: any, onTagChange: any, allSuggestions: string[] }) {
  const container = row.original;
  const isRunning = container.status === "running";
  
  return (
    <div className={`transition-all duration-500 rounded-[2rem] border overflow-hidden mb-5 backdrop-blur-2xl shadow-2xl ${row.getIsExpanded() ? 'bg-white/[0.05] border-white/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
      <div className="p-6 space-y-4">
        {/* Line 1: Name + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
               <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-neutral-600'}`} />
             </div>
             <span className="font-black text-white text-base tracking-tight truncate pr-2 max-w-[150px]">{container.name}</span>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border backdrop-blur-md ${
            isRunning 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-white/5 border-white/10 text-neutral-500"
          }`}>
            {isRunning ? "Operational" : "Suspended"}
          </div>
        </div>

        {/* Line 2: Stack + Stats - Glass Strip */}
        <div className="flex items-center justify-between bg-black/20 rounded-2xl px-5 py-3 border border-white/[0.03] shadow-inner">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-1">Stack</span>
            <Link
              href={`/stacks/${encodeURIComponent(container.stack)}`}
              className="text-[11px] font-black text-cyan-400 hover:text-cyan-300 truncate max-w-[100px]"
            >
              {container.stack}
            </Link>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-1">CPU</span>
            <span className="text-[11px] font-black text-neutral-300 tabular-nums">{container.cpu.toFixed(1)}%</span>
          </div>
          <div className="h-6 w-px bg-white/5" />
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-black text-neutral-600 uppercase tracking-widest leading-none mb-1">MEM</span>
            <span className="text-[11px] font-black text-neutral-300 tabular-nums">{container.mem.toFixed(1)}%</span>
          </div>
        </div>

        {/* Line 3: Notes & Tags Preview */}
        <div className="flex items-center gap-3">
          <StickyNote className="h-3.5 w-3.5 text-neutral-600" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-neutral-500 truncate">
               {container.note || "No situational notes added..."}
            </p>
          </div>
        </div>

        {/* Line 4: Primary Actions - Premium Dock Style */}
        <div className="flex items-center gap-2 pt-2">
          {isRunning ? (
            <div className="flex-1 flex gap-2">
              <button 
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-3 text-[10px] font-black tracking-widest text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                ROLLOUT
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-red-500/5 border border-red-500/10 py-3 text-[10px] font-black tracking-widest text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
              >
                <Square className="h-3.5 w-3.5" />
                TERMINATE
              </button>
            </div>
          ) : (
            <button 
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 py-3 text-[10px] font-black tracking-widest text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all"
            >
              <Play className="h-3.5 w-3.5" />
              PROVISION
            </button>
          )}
          <button 
            onClick={() => row.toggleExpanded()}
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
              row.getIsExpanded() 
                ? "bg-purple-500 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]" 
                : "bg-white/5 border-white/10 text-neutral-500 hover:border-white/20"
            }`}
          >
            {row.getIsExpanded() ? <ChevronDown className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Expanded section on Mobile */}
      {row.getIsExpanded() && (
        <div className="border-t border-white/5 bg-black/40 p-4">
          <ContainerExpandedRow
            containerId={container.id}
            containerName={container.name}
          />
        </div>
      )}
    </div>
  );
}

function Sparkline({ points }: { points: StatPoint[] }) {
  if (!points.length) return <div className="h-10" />;
  return (
    <div className="h-8 w-24 opacity-60 hover:opacity-100 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="mem" stroke="#a855f7" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ContainerTable() {
  const data = useStatsStream([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [allSuggestions, setAllSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/tags`)
      .then((res) => res.json())
      .then((data) => setAllSuggestions(data))
      .catch((err) => console.error("failed to fetch tag suggestions", err));
  }, []);

  const handleTagChange = async (containerId: string, newTags: string[]) => {
    try {
      const resp = await fetch(`${API_BASE}/api/containers/${containerId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: newTags }),
      });
    } catch (err) {
      console.error("failed to update tags", err);
    }
  };

  const columns = useMemo<ColumnDef<ContainerRow>[]>(
    () => [
      {
        id: "expander",
        header: "",
        cell: ({ row }) => (
          <button
            onClick={() => row.toggleExpanded()}
            className={`p-1.5 rounded-lg transition-all ${row.getIsExpanded() ? 'bg-purple-500/20 text-purple-400' : 'hover:bg-white/5 text-neutral-600'}`}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ),
        size: 40,
      },
      {
        id: "status",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-center">
             <div className={`h-2 w-2 rounded-full ${row.original.status === "running" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" : "bg-neutral-700"}`} />
          </div>
        ),
        size: 30,
      },
      {
        accessorKey: "name",
        header: "Container",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0 py-1">
            <span className="font-bold text-white tracking-tight truncate text-[13px] leading-tight">
              {row.original.name}
            </span>
            <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest leading-none mt-1">
              ID: {row.original.id.slice(0, 8)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "stack",
        header: "Stack",
        cell: ({ row }) => (
          <Link
            href={`/stacks/${encodeURIComponent(row.original.stack)}`}
            className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-400 hover:border-cyan-400/40 hover:bg-cyan-400/5 transition-all backdrop-blur-md"
          >
            {row.original.stack}
          </Link>
        ),
      },
      {
        id: "stats",
        header: "Live Telemetry",
        cell: ({ row }) => (
          <div className="flex items-center gap-4">
            <Sparkline points={row.original.spark} />
            <div className="flex gap-3 text-[10px] font-black tabular-nums border-l border-white/5 pl-4">
              <div className="flex flex-col">
                <span className="text-neutral-700 text-[8px] uppercase tracking-tighter">CPU</span>
                <span className="text-cyan-400/80">{row.original.cpu.toFixed(1)}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-neutral-700 text-[8px] uppercase tracking-tighter">RAM</span>
                <span className="text-purple-400/80">{row.original.mem.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "ports",
        header: "Endpoints",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1.5">
            {row.original.ports.length ? (
              row.original.ports.map((p) => (
                <a
                  key={p}
                  href={`http://localhost:${p}`}
                  className="rounded-lg border border-white/[0.05] bg-black/20 px-2 py-1 text-[9px] font-black font-mono text-neutral-400 hover:text-white hover:border-white/20 transition-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  :{p}
                </a>
              ))
            ) : (
              <span className="text-[9px] font-black text-neutral-800 uppercase tracking-widest">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "note",
        header: "Insights",
        cell: ({ row }) => {
          const [isFocused, setIsFocused] = useState(false);
          const hasNote = row.original.note && row.original.note.trim().length > 0;
          
          return (
            <div className="group relative max-w-[150px]">
              <input
                className="w-full rounded-xl bg-transparent px-3 py-1.5 text-[11px] font-bold text-neutral-300 outline-none transition-all hover:bg-white/[0.03] focus:bg-white/[0.05] focus:ring-1 focus:ring-white/10"
                defaultValue={row.original.note}
                placeholder={isFocused || !hasNote ? "Add note..." : ""}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "tags",
        header: "Classifiers",
        cell: ({ row }) => (
          <div className="min-w-[120px]">
            <TagInput
              tags={row.original.tags}
              onChange={(newTags) => {
                handleTagChange(row.original.id, newTags);
                row.original.tags = newTags;
              }}
              suggestions={allSuggestions}
            />
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const isRunning = row.original.status === "running";
          const isStopped = row.original.status === "exited";
          
          return (
            <div className="flex items-center gap-1.5 justify-end">
              {isStopped ? (
                <button 
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-500 transition-all hover:bg-emerald-500/20 active:scale-90" 
                  title="Provision"
                >
                  <Play className="h-3.5 w-3.5 fill-emerald-500/20" />
                </button>
              ) : (
                <>
                  <button 
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/10 bg-cyan-500/5 text-cyan-400 transition-all hover:bg-cyan-500/20 active:scale-90" 
                    title="Restart"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/10 bg-red-500/5 text-red-500 transition-all hover:bg-red-500/20 active:scale-90" 
                    title="Terminate"
                  >
                    <Square className="h-3.5 w-3.5 fill-red-500/20" />
                  </button>
                </>
              )}
              <div className="h-4 w-px bg-white/5 mx-1" />
              <button 
                onClick={() => row.toggleExpanded()}
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                  row.getIsExpanded() 
                    ? "bg-purple-500 border-purple-400 text-white shadow-lg" 
                    : "border-white/5 bg-white/5 text-neutral-500 hover:text-white hover:border-white/20"
                }`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          );
        },
        size: 150,
      },
    ],
    [allSuggestions]
  );

  const uniqueStacks = useMemo(() => {
    const stacks = new Set(data.map((r) => r.stack));
    return Array.from(stacks).sort();
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="space-y-8">
      {/* Filters Bar - Sticky Glass */}
      <div className="sticky top-0 z-20 -mx-6 lg:mx-0 mb-8 bg-neutral-950/60 lg:bg-transparent px-6 py-4 lg:p-0 backdrop-blur-xl lg:backdrop-blur-none transition-all">
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl shadow-2xl backdrop-blur-2xl">
          {/* Search */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <input
              placeholder="Filter assets..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full rounded-2xl border border-white/5 bg-black/20 py-3 pl-12 pr-4 text-[13px] font-bold text-neutral-200 outline-none focus:border-cyan-500/40 focus:ring-4 focus:ring-cyan-500/5 transition-all shadow-inner placeholder:text-neutral-700"
            />
          </div>

          {/* Filters Group */}
          <div className="flex gap-2 w-full sm:w-auto ml-auto">
            <div className="flex items-center gap-2 bg-black/20 border border-white/5 rounded-2xl px-2 py-1.5 shadow-inner">
              <select
                value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
                onChange={(e) => table.getColumn("status")?.setFilterValue(e.target.value)}
                className="bg-transparent px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 outline-none cursor-pointer hover:text-white transition-colors"
              >
                <option value="" className="bg-neutral-900 font-sans">Status: Any</option>
                <option value="running" className="bg-neutral-900 font-sans">Operational</option>
                <option value="stopped" className="bg-neutral-900 font-sans">Suspended</option>
              </select>
              <div className="h-4 w-px bg-white/5" />
              <select
                value={(table.getColumn("stack")?.getFilterValue() as string) ?? ""}
                onChange={(e) => table.getColumn("stack")?.setFilterValue(e.target.value)}
                className="bg-transparent px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 outline-none cursor-pointer hover:text-white transition-colors"
              >
                <option value="" className="bg-neutral-900 font-sans">Stacks: All</option>
                {uniqueStacks.map((s) => (
                  <option key={s} value={s} className="bg-neutral-900 font-sans">
                    {s}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="hidden lg:flex items-center justify-center px-6 rounded-2xl border border-white/5 bg-black/20 text-[10px] font-black tracking-[0.2em] text-neutral-600 uppercase shadow-inner">
              <span className="text-purple-500 mr-2">{table.getFilteredRowModel().rows.length}</span>
              <span className="text-neutral-800">/</span>
              <span className="ml-2">{data.length} Assets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        {table.getRowModel().rows.map((row) => (
          <ContainerCard 
            key={row.id} 
            row={row} 
            onTagChange={handleTagChange} 
            allSuggestions={allSuggestions} 
          />
        ))}
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-20 bg-white/[0.02] rounded-[2rem] border border-white/5 backdrop-blur-xl">
            <Search className="mx-auto h-10 w-10 text-neutral-800 mb-4" />
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-neutral-600">No matches found</p>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-[2.5rem] border border-white/[0.08] bg-white/[0.02] shadow-2xl backdrop-blur-3xl">
        <table className="min-w-full divide-y divide-white/[0.05] border-collapse">
          <thead className="bg-white/[0.02] text-[10px] uppercase font-black tracking-[0.2em] text-neutral-500 sticky top-0 z-10 backdrop-blur-xl">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th 
                    key={header.id} 
                    className="px-6 py-5 text-left border-b border-white/[0.05]"
                  >
                    {header.isPlaceholder ? null : header.column.columnDef.header as string}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className={`hover:bg-white/[0.03] group transition-all duration-300 ${row.getIsExpanded() ? "bg-purple-500/5" : ""}`}>
                  {row.getVisibleCells().map((cell) => (
                    <td 
                      key={cell.id} 
                      className="px-6 py-4 align-middle"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() && (
                  <tr key={`${row.id}-expanded`}>
                    <td colSpan={row.getVisibleCells().length} className="p-0 border-b border-white/[0.05] bg-black/40">
                      <div className="p-8">
                        <ContainerExpandedRow
                          containerId={row.original.id}
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
          <div className="text-center py-32">
            <Search className="mx-auto h-16 w-16 text-neutral-900 mb-6" />
            <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-neutral-700">Inventory Empty</h3>
          </div>
        )}
      </div>
    </div>
  );
}
