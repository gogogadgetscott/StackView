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
    { id: "logs" as Tab, icon: ScrollText, label: "Logs", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { id: "env" as Tab, icon: Key, label: "Env Vars", color: "text-purple-400", bg: "bg-purple-500/10" },
    { id: "mounts" as Tab, icon: HardDrive, label: "Mounts", color: "text-amber-400", bg: "bg-amber-500/10" },
    { id: "inspect" as Tab, icon: FileText, label: "Inspect", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Action Tabs - Premium Glass Dock */}
      <div className="flex flex-wrap gap-3">
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleTabClick(btn.id)}
            className={`flex items-center gap-3 rounded-2xl border px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-xl ${
              activeTab === btn.id
                ? `border-white/20 ${btn.bg} ${btn.color} shadow-lg shadow-white/5`
                : "border-white/5 bg-white/[0.02] text-neutral-500 hover:border-white/10 hover:bg-white/[0.05]"
            }`}
          >
            <btn.icon className={`h-4 w-4 ${activeTab === btn.id ? btn.color : "text-neutral-700"}`} />
            {btn.label}
          </button>
        ))}
        <button
          className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.01] px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-neutral-800 cursor-not-allowed opacity-40"
          title="Terminal coming soon"
          disabled
        >
          <Terminal className="h-4 w-4" />
          Terminal
        </button>
      </div>

      {/* Tab Content Panel - Glass */}
      {loading && (
        <div className="flex items-center gap-4 text-neutral-600 font-black text-[10px] uppercase tracking-[0.2em] py-10 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
          Synchronizing State...
        </div>
      )}

      {activeTab && !loading && (
        <div className="rounded-3xl border border-white/[0.05] bg-black/40 overflow-hidden shadow-2xl backdrop-blur-3xl animate-in fade-in slide-in-from-top-2 duration-500">
           <div className="max-h-[400px] overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
              {activeTab === "logs" && (
                <div className="p-6 font-mono text-[11px] leading-relaxed text-neutral-400">
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2 border border-white/5">
                    <ScrollText className="h-4 w-4 text-cyan-400" />
                    <span className="font-black uppercase tracking-widest text-neutral-500 text-[9px]">Live Stream Active</span>
                  </div>
                  {logs.length === 0 ? (
                    <div className="py-10 text-center opacity-40 italic">
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
                  <table className="min-w-full">
                    <tbody className="divide-y divide-white/[0.03]">
                      {detail.env.map((e, i) => {
                        const [key, ...valueParts] = e.split("=");
                        const value = valueParts.join("=");
                        return (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-3 pr-8 font-mono text-[11px] text-purple-400/80 font-black tracking-tight">{key}</td>
                            <td className="py-3 font-mono text-[11px] text-neutral-400 break-all">{value || "—"}</td>
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
                    <div className="py-10 text-center opacity-40 italic text-[11px]">
                      No persistent storage volumes detected.
                    </div>
                  ) : (
                    <table className="min-w-full">
                      <thead>
                        <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-600">
                          <th className="pb-4 pr-6 text-left">Internal Path</th>
                          <th className="pb-4 pr-6 text-left">External Source</th>
                          <th className="pb-4 text-center">Protocol</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {detail.mounts.map((m, i) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-3 pr-6 font-mono text-[11px] text-amber-400/80 font-black">{m.destination}</td>
                            <td className="py-3 pr-6 font-mono text-[11px] text-neutral-400">{m.source}</td>
                            <td className="py-3 text-center">
                              <span className="rounded-lg bg-white/5 border border-white/5 px-2 py-1 text-[9px] font-black text-neutral-600 uppercase">
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
                <div className="p-6">
                   <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2 border border-white/5">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span className="font-black uppercase tracking-widest text-neutral-500 text-[9px]">Raw Engine Manifest</span>
                  </div>
                  <pre className="font-mono text-[10px] leading-relaxed text-emerald-500/80 whitespace-pre-wrap bg-black/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                    {JSON.stringify(detail, null, 2)}
                  </pre>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
