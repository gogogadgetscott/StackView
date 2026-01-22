"use client";

import { useState, useEffect } from "react";
import {
  Terminal,
  FileText,
  HardDrive,
  Key,
  ScrollText,
  Loader2,
  ChevronRight
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
  const [activeTab, setActiveTab] = useState<Tab | null>("logs");
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
      // Allow closing logs if needed, but usually we want at least one open or just stay on it
      return;
    }
    setActiveTab(tab);
    if (tab !== "logs") {
      await fetchDetail();
    }
  };

  const actionButtons = [
    { id: "logs" as Tab, icon: ScrollText, label: "Logs", color: "text-blue-600", bg: "bg-blue-50" },
    { id: "env" as Tab, icon: Key, label: "Env Vars", color: "text-slate-600", bg: "bg-slate-100" },
    { id: "mounts" as Tab, icon: HardDrive, label: "Mounts", color: "text-slate-600", bg: "bg-slate-100" },
    { id: "inspect" as Tab, icon: FileText, label: "Inspect", color: "text-slate-600", bg: "bg-slate-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
        <div className="h-4 w-1 bg-blue-600 rounded-full" />
        Detailed Telemetry
      </div>

      {/* Action Tabs */}
      <div className="flex flex-wrap gap-2">
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleTabClick(btn.id)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === btn.id
                ? `border-blue-200 ${btn.bg} ${btn.color} shadow-sm`
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <btn.icon className={`h-4 w-4 ${activeTab === btn.id ? btn.color : "text-slate-400"}`} />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Tab Content Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden premium-shadow min-h-[200px]">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] py-20 justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            Synchronizing...
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto scrollbar-thin">
            {activeTab === "logs" && (
              <div className="p-6 font-mono text-[11px] leading-relaxed text-slate-600">
                <div className="mb-4 flex items-center gap-2 text-[9px] font-black uppercase text-blue-600">
                  <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse" />
                  Live Stream Active
                </div>
                {logs.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 italic">
                    Waiting for telemetry stream...
                  </div>
                ) : (
                    <div className="space-y-1">
                      {logs.map((line, i) => <div key={i} className="whitespace-pre-wrap">{line}</div>)}
                    </div>
                )}
              </div>
            )}

            {activeTab === "env" && detail && (
              <div className="p-6">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-100">
                    {detail.env.map((e, i) => {
                      const [key, ...valueParts] = e.split("=");
                      const value = valueParts.join("=");
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pr-8 font-mono text-[11px] text-blue-700 font-black tracking-tight">{key}</td>
                          <td className="py-3 font-mono text-[11px] text-slate-500 break-all">{value || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "mounts" && detail && (
              <div className="p-6">
                {detail.mounts.length === 0 ? (
                  <div className="py-20 text-center text-slate-300 italic text-[11px]">
                    No persistent storage volumes detected.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="pb-4 pr-6 text-left">Internal Path</th>
                        <th className="pb-4 pr-6 text-left">External Source</th>
                        <th className="pb-4 text-center">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.mounts.map((m, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pr-6 font-mono text-[11px] text-slate-700 font-black">{m.destination}</td>
                          <td className="py-3 pr-6 font-mono text-[11px] text-slate-400">{m.source}</td>
                          <td className="py-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 rounded uppercase">
                              {m.mode}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === "inspect" && detail && (
              <div className="p-6 bg-slate-950">
                <pre className="font-mono text-[10px] leading-relaxed text-blue-400 whitespace-pre-wrap">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

