"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  SortingState,
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
import { Play, Square, RefreshCw, StickyNote, ChevronRight, ChevronDown } from "lucide-react";

import { ContainerRow, StatPoint } from "../lib/types";
import { ContainerExpandedRow } from "./container-expanded-row";
import { TagInput, TagBadge } from "./tag-input";

const API_BASE = process.env.NEXT_PUBLIC_STACKVIEW_API ?? "http://localhost:8080";
const WS_URL = process.env.NEXT_PUBLIC_STACKVIEW_WS ?? "ws://localhost:8080/ws/stats";

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
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4 text-cyan-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-neutral-500" />
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
          <div className="font-medium text-neutral-100">
            <div>{row.original.name}</div>
            <div className="text-xs text-neutral-500">{row.original.id.slice(0, 12)}</div>
          </div>
        ),
      },
      {
        accessorKey: "stack",
        header: "Stack",
        cell: ({ row }) => (
          <Link
            href={`/stacks/${encodeURIComponent(row.original.stack)}`}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-cyan-200 hover:border-cyan-500 hover:bg-neutral-800 transition-colors"
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
            <div className="text-sm text-neutral-300">
              <div>CPU {row.original.cpu.toFixed(1)}%</div>
              <div>Mem {row.original.mem.toFixed(1)}%</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "ports",
        header: "Ports",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2 text-xs text-cyan-200">
            {row.original.ports.length ? (
              row.original.ports.map((p) => (
                <a
                  key={p}
                  href={`http://localhost:${p}`}
                  className="rounded border border-neutral-800 px-2 py-1 hover:border-cyan-500"
                  target="_blank"
                  rel="noreferrer"
                >
                  {p}
                </a>
              ))
            ) : (
              <span className="text-neutral-500">—</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "note",
        header: "User Notes",
        cell: ({ row }) => (
          <div className="group flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 hover:border-cyan-500">
            <StickyNote className="h-4 w-4 text-neutral-500" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              defaultValue={row.original.note}
              placeholder="Add note"
            />
          </div>
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => (
          <TagInput
            tags={row.original.tags}
            onChange={(newTags) => {
              handleTagChange(row.original.id, newTags);
              // Optimistically update the row?
              row.original.tags = newTags;
            }}
            suggestions={allSuggestions}
          />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: () => (
          <div className="flex items-center gap-2 text-neutral-300">
            <button className="rounded border border-neutral-800 bg-neutral-900 p-2 hover:border-emerald-500" title="Start">
              <Play className="h-4 w-4" />
            </button>
            <button className="rounded border border-neutral-800 bg-neutral-900 p-2 hover:border-red-500" title="Stop">
              <Square className="h-4 w-4" />
            </button>
            <button className="rounded border border-neutral-800 bg-neutral-900 p-2 hover:border-cyan-500" title="Restart">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        ),
        size: 120,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-xl">
      <table className="min-w-full divide-y divide-neutral-800">
        <thead className="bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 text-left">
                  {header.isPlaceholder ? null : header.column.columnDef.header as string}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {table.getRowModel().rows.map((row) => (
            <>
              <tr key={row.id} className={`hover:bg-neutral-800/40 ${row.getIsExpanded() ? "bg-neutral-800/20" : ""}`}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr key={`${row.id}-expanded`}>
                  <td colSpan={row.getVisibleCells().length} className="p-0">
                    <ContainerExpandedRow
                      containerId={row.original.id}
                      containerName={row.original.name}
                    />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
