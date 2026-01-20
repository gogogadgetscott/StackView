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
      .catch((err) => console.error("failed to fetch tags", err));
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

    socket.onerror = (err) => console.error("ws error", err);
    return () => socket.close();
  }, [containerIds, tagMap]);

  return rows;
}

function ContainerCard({ row, onTagChange, allSuggestions }: { row: any, onTagChange: any, allSuggestions: string[] }) {
  const container = row.original;
  const isRunning = container.status === "running";
  
  return (
    <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden mb-3 shadow-md">
      <div className="p-4 space-y-3">
        {/* Line 1: Name + Status */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-neutral-100 text-base truncate pr-2">{container.name}</span>
          <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
            isRunning 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-neutral-500/10 border-neutral-500/30 text-neutral-400"
          }`}>
            {isRunning ? "Running" : "Stopped"}
          </div>
        </div>

        {/* Line 2: Stack + Stats */}
        <div className="flex items-center text-xs text-neutral-400 font-medium tracking-tight">
          <Link
            href={`/stacks/${encodeURIComponent(container.stack)}`}
            className="text-cyan-400 hover:underline"
          >
            {container.stack}
          </Link>
          <span className="mx-2 text-neutral-700">·</span>
          <span>CPU {container.cpu.toFixed(1)}%</span>
          <span className="mx-2 text-neutral-700">·</span>
          <span>Mem {container.mem.toFixed(1)}%</span>
        </div>

        {/* Line 3: Notes */}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            {container.note ? (
              <p className="text-xs text-neutral-300 truncate italic">"{container.note}"</p>
            ) : (
              <p className="text-xs text-neutral-500 italic">No notes</p>
            )}
          </div>
          <button className="shrink-0 px-2 py-1 rounded border border-neutral-800 bg-neutral-800/50 text-[10px] font-bold uppercase tracking-tighter text-neutral-400 hover:text-neutral-200">
            Add Note
          </button>
        </div>

        {/* Line 4: Primary Actions */}
        <div className="flex items-center gap-2 pt-2">
          {isRunning ? (
            <>
              <button 
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 py-2.5 text-xs font-bold text-cyan-400 active:bg-cyan-500/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                RESTART
              </button>
              <button 
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 py-2.5 text-xs font-bold text-red-400 active:bg-red-500/20"
              >
                <Square className="h-3.5 w-3.5" />
                STOP
              </button>
            </>
          ) : (
            <button 
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-xs font-bold text-emerald-400 active:bg-emerald-500/20"
            >
              <Play className="h-3.5 w-3.5" />
              START
            </button>
          )}
          <button 
            onClick={() => row.toggleExpanded()}
            className={`px-3 py-2.5 rounded-lg border flex items-center justify-center transition-colors ${
              row.getIsExpanded() 
                ? "bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/20" 
                : "bg-neutral-800 border-neutral-700 text-neutral-400"
            }`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded section on Mobile */}
      {row.getIsExpanded() && (
        <div className="border-t border-neutral-800 bg-neutral-950/20">
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
    <div className="h-10 w-32" style={{ minWidth: 128, minHeight: 40 }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <LineChart data={points} margin={{ top: 2, bottom: 2, right: 0, left: 0 }}>
          <CartesianGrid stroke="#1f2937" strokeWidth={0.5} vertical={false} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb" }}
            formatter={(value: any) => `${value.toFixed(1)}%`}
            labelFormatter={(label) => new Date(label).toLocaleTimeString()}
          />
          <Line type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
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
      if (resp.ok) {
        // Update local state is handled by the hook if we pass an update function
        // but for now let's just assume the UI is snappy enough
      }
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
            className={`p-1 rounded transition-colors ${row.getIsExpanded() ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-neutral-800 text-neutral-500'}`}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ),
        size: 32,
      },
      {
        id: "status",
        header: "",
        cell: ({ row }) => (
          <span
            className={`mr-2 inline-flex h-2 w-2 items-center justify-center rounded-full shadow-inner shadow-cyan-400/40 ${
              row.original.status === "running" ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"
            }`}
          />
        ),
        size: 24,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0">
            <div 
              className="font-semibold text-neutral-100 truncate max-w-[180px] sm:max-w-none cursor-default" 
              title={`Container ID: ${row.original.id}`}
            >
              {row.original.name}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "stack",
        header: "Stack",
        cell: ({ row }) => (
          <Link
            href={`/stacks/${encodeURIComponent(row.original.stack)}`}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200 hover:border-cyan-500 hover:bg-neutral-800 transition-colors"
          >
            {row.original.stack}
          </Link>
        ),
      },
      {
        id: "stats",
        header: "Stats",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Sparkline points={row.original.spark} />
            <div className="text-[11px] font-bold text-neutral-400 tabular-nums">
              <div className="text-cyan-400">{row.original.cpu.toFixed(1)}%</div>
              <div className="text-purple-400">{row.original.mem.toFixed(1)}%</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "ports",
        header: "Ports",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1 text-[10px] font-bold font-mono text-cyan-200">
            {row.original.ports.length ? (
              row.original.ports.map((p) => (
                <a
                  key={p}
                  href={`http://localhost:${p}`}
                  className="rounded border border-neutral-800 px-1.5 py-0.5 hover:border-cyan-500"
                  target="_blank"
                  rel="noreferrer"
                >
                  {p}
                </a>
              ))
            ) : (
              <span className="text-neutral-700">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "note",
        header: "Notes",
        cell: ({ row }) => {
          const [isFocused, setIsFocused] = useState(false);
          const hasNote = row.original.note && row.original.note.trim().length > 0;
          
          return (
            <div className="group relative">
              <input
                className="w-full rounded bg-transparent px-2 py-0.5 text-sm text-neutral-200 outline-none transition-colors hover:bg-neutral-900/50 focus:bg-neutral-900 focus:ring-1 focus:ring-cyan-500/30 font-medium"
                defaultValue={row.original.note}
                placeholder={isFocused || !hasNote ? "Add note…" : ""}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              {!hasNote && !isFocused && (
                <div className="pointer-events-none absolute inset-0 flex items-center px-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <StickyNote className="mr-2 h-3 w-3 text-neutral-600" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-neutral-600">Add note…</span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => (
          <div className="min-w-[150px]">
            <TagInput
              tags={row.original.tags}
              onChange={(newTags) => {
                handleTagChange(row.original.id, newTags);
                // Optimistically update the row?
                row.original.tags = newTags;
              }}
              suggestions={allSuggestions}
            />
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const isRunning = row.original.status === "running";
          const isStopped = row.original.status === "exited";
          
          return (
            <div className="flex items-center gap-2">
              {isStopped ? (
                <button 
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold tracking-widest text-emerald-400 transition-all hover:bg-emerald-500/20 hover:border-emerald-500/50" 
                  title="Start container"
                >
                  <Play className="h-3 w-3" />
                  <span>START</span>
                </button>
              ) : (
                <>
                  <button 
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-600/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold tracking-widest text-cyan-400 transition-all hover:bg-cyan-500/20 hover:border-cyan-500/50" 
                    title="Restart container"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>RESTART</span>
                  </button>
                  <button 
                    className="flex items-center gap-1.5 rounded-lg border border-red-600/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold tracking-widest text-red-400 transition-all hover:bg-red-500/20 hover:border-red-500/50" 
                    title="Stop container"
                  >
                    <Square className="h-3 w-3" />
                    <span>STOP</span>
                  </button>
                </>
              )}
              <button 
                onClick={() => row.toggleExpanded()}
                className={`flex items-center gap-2 rounded-lg border px-1.5 py-1 transition-all ${
                  row.getIsExpanded() 
                    ? "bg-cyan-500 border-cyan-500 text-white shadow-lg shadow-cyan-500/20" 
                    : "border-neutral-800 bg-neutral-900/40 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700"
                }`}
                title="View more details (Logs, Env, Inspect)"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
        size: 160,
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
    <div className="space-y-4">
      {/* Filters Bar - Sticky for convenience */}
      <div className="sticky top-0 lg:top-auto z-20 -mx-4 lg:mx-0 mb-4 bg-neutral-950/95 lg:bg-transparent px-4 py-3 lg:p-0 backdrop-blur-md transition-all border-b border-neutral-800 lg:border-none shadow-xl lg:shadow-none">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              placeholder="Search containers..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-2.5 lg:py-2 pl-9 pr-4 text-sm text-neutral-200 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-sm"
            />
          </div>

          {/* Filters Group for Mobile Flow */}
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("status")?.setFilterValue(e.target.value)}
              className="flex-1 sm:flex-none sm:min-w-[140px] rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 lg:py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300 outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="">All Statuses</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
            </select>

            <select
              value={(table.getColumn("stack")?.getFilterValue() as string) ?? ""}
              onChange={(e) => table.getColumn("stack")?.setFilterValue(e.target.value)}
              className="flex-1 sm:flex-none sm:min-w-[140px] rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 lg:py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300 outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="">All Stacks</option>
              {uniqueStacks.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden lg:block text-[10px] uppercase font-bold tracking-widest text-neutral-600 ml-auto bg-neutral-900/50 px-2 py-1 rounded-md border border-neutral-800/50">
            {table.getFilteredRowModel().rows.length} / {data.length}
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden px-0.5">
        {table.getRowModel().rows.map((row) => (
          <ContainerCard 
            key={row.id} 
            row={row} 
            onTagChange={handleTagChange} 
            allSuggestions={allSuggestions} 
          />
        ))}
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-12 text-neutral-500 text-sm italic bg-neutral-900/20 rounded-xl border border-neutral-800">
            No containers match your search.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-neutral-800/60 bg-neutral-900/40 shadow-2xl backdrop-blur-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800">
        <table className="min-w-full divide-y divide-neutral-800 border-collapse">
          <thead className="bg-neutral-900/80 text-[10px] uppercase font-bold tracking-widest text-neutral-500 sticky top-0 z-10 backdrop-blur-md">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const columnId = header.id || header.column.id;
                  const isHiddenOnMobile = ["stack", "ports", "note", "tags", "actions", "stats"].includes(columnId);
                  return (
                    <th 
                      key={header.id} 
                      className={`px-4 py-2.5 text-left border-b border-neutral-800 ${isHiddenOnMobile ? 'hidden lg:table-cell' : ''}`}
                    >
                      {header.isPlaceholder ? null : header.column.columnDef.header as string}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-neutral-800/50">
            {table.getRowModel().rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className={`hover:bg-neutral-800/40 group transition-colors ${row.getIsExpanded() ? "bg-cyan-500/5" : ""}`}>
                  {row.getVisibleCells().map((cell) => {
                    const columnId = cell.column.id;
                    const isHiddenOnMobile = ["stack", "ports", "note", "tags", "actions", "stats"].includes(columnId);
                    return (
                      <td 
                        key={cell.id} 
                        className={`px-4 py-1.5 align-middle ${isHiddenOnMobile ? 'hidden lg:table-cell' : ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
                {row.getIsExpanded() && (
                  <tr key={`${row.id}-expanded`}>
                    <td colSpan={row.getVisibleCells().length} className="p-0 border-b border-neutral-800/50">
                      <ContainerExpandedRow
                        containerId={row.original.id}
                        containerName={row.original.name}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
