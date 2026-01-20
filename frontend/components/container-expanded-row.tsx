"use client";

import { useState, useEffect } from "react";
import {
  Terminal,
  FileText,
  HardDrive,
  Key,
  ScrollText,
  Loader2,
} from "lucide-react";
import { ContainerDetail } from "../lib/types";
import { API_BASE, WS_LOGS_URL } from "../lib/api-config";

type Tab = "logs" | "env" | "mounts" | "inspect";

export function ContainerExpandedRow({
  containerId,
  containerName,
}: {
  containerId: string;
  containerName: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [detail, setDetail] = useState<ContainerDetail | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDetail = async () => {
    if (detail) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/containers/${containerId}`);
      if (res.ok) {
        setDetail(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch container detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabClick = async (tab: Tab) => {
    if (activeTab === tab) {
      setActiveTab(null);
      return;
    }
    setActiveTab(tab);
    if (tab !== "logs") {
      await fetchDetail();
    }
  };

  const actionButtons = [
    { id: "logs" as Tab, icon: ScrollText, label: "Logs", color: "hover:border-cyan-500" },
    { id: "env" as Tab, icon: Key, label: "Env Vars", color: "hover:border-purple-500" },
    { id: "mounts" as Tab, icon: HardDrive, label: "Mounts", color: "hover:border-yellow-500" },
    { id: "inspect" as Tab, icon: FileText, label: "Inspect", color: "hover:border-emerald-500" },
  ];

  return (
    <div className="bg-neutral-950/50 px-6 py-4 border-t border-neutral-800">
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleTabClick(btn.id)}
            className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
              activeTab === btn.id
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                : `border-neutral-700 bg-neutral-900 text-neutral-300 ${btn.color}`
            }`}
          >
            <btn.icon className="h-4 w-4" />
            {btn.label}
          </button>
        ))}
        <button
          className="flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-300 hover:border-orange-500 transition-colors"
          title="Coming soon"
          disabled
        >
          <Terminal className="h-4 w-4" />
          Terminal
        </button>
      </div>

      {/* Tab Content */}
      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      )}

      {activeTab === "logs" && (
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 max-h-64 overflow-auto font-mono text-xs text-neutral-300">
          <p className="text-neutral-500">
            Connect to WebSocket at <code>{WS_LOGS_URL}</code> for live logs.
          </p>
          {logs.length === 0 ? (
            <p className="text-neutral-500 mt-2">No logs available yet.</p>
          ) : (
            logs.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      )}

      {activeTab === "env" && detail && (
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 max-h-64 overflow-auto">
          <table className="min-w-full text-xs">
            <tbody className="divide-y divide-neutral-800">
              {detail.env.map((e, i) => {
                const [key, ...valueParts] = e.split("=");
                const value = valueParts.join("=");
                return (
                  <tr key={i} className="hover:bg-neutral-800/40">
                    <td className="py-1 pr-4 font-mono text-purple-300">{key}</td>
                    <td className="py-1 font-mono text-neutral-300">{value || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "mounts" && detail && (
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 max-h-64 overflow-auto">
          {detail.mounts.length === 0 ? (
            <p className="text-neutral-500 text-sm">No mounts configured.</p>
          ) : (
            <table className="min-w-full text-xs">
              <thead className="text-neutral-500 uppercase">
                <tr>
                  <th className="py-1 pr-4 text-left">Source</th>
                  <th className="py-1 pr-4 text-left">Destination</th>
                  <th className="py-1 text-left">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {detail.mounts.map((m, i) => (
                  <tr key={i} className="hover:bg-neutral-800/40">
                    <td className="py-1 pr-4 font-mono text-yellow-300">{m.source}</td>
                    <td className="py-1 pr-4 font-mono text-neutral-300">{m.destination}</td>
                    <td className="py-1 font-mono text-neutral-500">{m.mode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === "inspect" && detail && (
        <div className="rounded border border-neutral-800 bg-neutral-900 p-4 max-h-64 overflow-auto">
          <pre className="font-mono text-xs text-emerald-300 whitespace-pre-wrap">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
