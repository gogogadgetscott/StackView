"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { Clock, TrendingUp, RefreshCw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type AggregatedStats = {
  timestamp: string;
  avgCpu: number;
  maxCpu: number;
  avgMemory: number;
  maxMemory: number;
  restarts: number;
  sampleCount: number;
};

type ContainerHistory = {
  containerId: string;
  stackName: string;
  points: AggregatedStats[];
};

type StackHistory = {
  stackName: string;
  containers: ContainerHistory[];
  aggregated: AggregatedStats[];
};

type TimeRange = "24h" | "7d";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function StackHistoryChart({ stackName }: { stackName: string }) {
  const [history, setHistory] = useState<StackHistory | null>(null);
  const [range, setRange] = useState<TimeRange>("24h");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<"cpu" | "memory">("cpu");

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/stacks/${encodeURIComponent(stackName)}/history?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json();
      })
      .then((data) => setHistory(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [stackName, range]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400 text-center">
        {error}
      </div>
    );
  }

  if (!history || history.aggregated.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-8 text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
        <h3 className="text-lg font-medium text-neutral-300 mb-2">No Historical Data</h3>
        <p className="text-sm text-neutral-500">
          Stats will appear here after the system collects data for a few minutes.
        </p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = history.aggregated
    .map((p) => ({
      time: p.timestamp,
      cpu: metric === "cpu" ? p.avgCpu : undefined,
      maxCpu: metric === "cpu" ? p.maxCpu : undefined,
      memory: metric === "memory" ? p.avgMemory : undefined,
      maxMemory: metric === "memory" ? p.maxMemory : undefined,
      restarts: p.restarts,
    }))
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Find restart events for reference lines
  const restartEvents = chartData.filter((d) => d.restarts > 0);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-medium text-neutral-100">Historical Stats</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Metric Toggle */}
          <div className="flex rounded-lg border border-neutral-700 overflow-hidden">
            <button
              onClick={() => setMetric("cpu")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                metric === "cpu"
                  ? "bg-cyan-500 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              CPU
            </button>
            <button
              onClick={() => setMetric("memory")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                metric === "memory"
                  ? "bg-purple-500 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Memory
            </button>
          </div>

          {/* Time Range Toggle */}
          <div className="flex rounded-lg border border-neutral-700 overflow-hidden">
            <button
              onClick={() => setRange("24h")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                range === "24h"
                  ? "bg-neutral-700 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              24h
            </button>
            <button
              onClick={() => setRange("7d")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                range === "7d"
                  ? "bg-neutral-700 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              7d
            </button>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="time"
              tickFormatter={range === "24h" ? formatTime : formatDate}
              stroke="#666"
              fontSize={12}
            />
            <YAxis
              stroke="#666"
              fontSize={12}
              domain={[0, "auto"]}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#999" }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, metric === "cpu" ? "CPU" : "Memory"]}
              labelFormatter={(label) => new Date(label).toLocaleString()}
            />
            <Legend />

            {metric === "cpu" && (
              <>
                <Line
                  type="monotone"
                  dataKey="cpu"
                  name="Avg CPU"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="maxCpu"
                  name="Max CPU"
                  stroke="#06b6d4"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  opacity={0.5}
                />
              </>
            )}

            {metric === "memory" && (
              <>
                <Line
                  type="monotone"
                  dataKey="memory"
                  name="Avg Memory"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="maxMemory"
                  name="Max Memory"
                  stroke="#a855f7"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  opacity={0.5}
                />
              </>
            )}

            {/* Restart events */}
            {restartEvents.map((event, i) => (
              <ReferenceLine
                key={i}
                x={event.time}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: "↻", position: "top", fill: "#ef4444" }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <div className="text-xs text-neutral-500 uppercase mb-1">Avg CPU</div>
          <div className="text-lg font-semibold text-cyan-400">
            {(chartData.reduce((sum, d) => sum + (d.cpu || 0), 0) / chartData.length || 0).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <div className="text-xs text-neutral-500 uppercase mb-1">Max CPU</div>
          <div className="text-lg font-semibold text-cyan-400">
            {Math.max(...chartData.map((d) => d.maxCpu || 0)).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <div className="text-xs text-neutral-500 uppercase mb-1">Avg Memory</div>
          <div className="text-lg font-semibold text-purple-400">
            {(chartData.reduce((sum, d) => sum + (d.memory || 0), 0) / chartData.length || 0).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg bg-neutral-800/50 p-3 text-center">
          <div className="text-xs text-neutral-500 uppercase mb-1">Restarts</div>
          <div className="text-lg font-semibold text-red-400">
            {chartData.reduce((sum, d) => sum + (d.restarts || 0), 0)}
          </div>
        </div>
      </div>
    </div>
  );
}
