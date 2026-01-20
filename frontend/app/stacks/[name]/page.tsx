"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Square,
  RefreshCw,
  Download,
  Terminal,
  FileCode,
  GitCompare,
  ScrollText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { StackDetail, ControlResponse } from "../../../lib/types";
import { StackLogs } from "../../../components/stack-logs";
import { WebTerminal } from "../../../components/web-terminal";
import { ComposeEditor } from "../../../components/compose-editor";
import { StackDiffView } from "../../../components/stack-diff";

import { API_BASE as API_URL } from "../../../lib/api-config";

type Tab = "logs" | "terminal" | "compose" | "diff";

async function fetchStackDetail(name: string): Promise<StackDetail> {
  const res = await fetch(`${API_URL}/api/stacks/${name}`);
  if (!res.ok) throw new Error("Failed to fetch stack");
  return res.json();
}

async function executeStackAction(name: string, action: string): Promise<ControlResponse> {
  const res = await fetch(`${API_URL}/api/stacks/${name}/${action}`, { method: "POST" });
  return res.json();
}

export default function StackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stackName = params.name as string;

  const [stack, setStack] = useState<StackDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("logs");
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStackDetail(stackName)
      .then(setStack)
      .catch((err) => setError(err.message));
  }, [stackName]);

  const handleAction = async (action: string) => {
    setIsLoading(true);
    setActionStatus(null);
    try {
      const result = await executeStackAction(stackName, action);
      setActionStatus({
        type: result.success ? "success" : "error",
        message: result.message,
      });
      // Refresh stack details after action
      const updated = await fetchStackDetail(stackName);
      setStack(updated);
    } catch (err) {
      setActionStatus({ type: "error", message: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-xl text-red-400">{error}</h1>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-cyan-400 hover:underline"
          >
            ← Back to containers
          </button>
        </div>
      </main>
    );
  }

  if (!stack) {
    return (
      <main className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center">
        <div className="animate-pulse text-neutral-400">Loading stack...</div>
      </main>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "logs", label: "Logs", icon: <ScrollText className="h-4 w-4" /> },
    { id: "terminal", label: "Terminal", icon: <Terminal className="h-4 w-4" /> },
    { id: "compose", label: "Compose", icon: <FileCode className="h-4 w-4" /> },
    { id: "diff", label: "Diff", icon: <GitCompare className="h-4 w-4" /> },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Header */}
        <header className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="mb-4 flex items-center gap-2 text-sm text-neutral-400 hover:text-cyan-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to containers
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold">{stack.name}</h1>
              <p className="text-sm text-neutral-400 font-mono">{stack.path}</p>
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {stack.runningCount} running
                </span>
                {stack.stoppedCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-neutral-500" />
                    {stack.stoppedCount} stopped
                  </span>
                )}
                {stack.unhealthyCount > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                    {stack.unhealthyCount} unhealthy
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction("start")}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:border-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
              <button
                onClick={() => handleAction("stop")}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
              <button
                onClick={() => handleAction("recreate")}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Recreate
              </button>
              <button
                onClick={() => handleAction("redeploy")}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:border-purple-500 hover:text-purple-400 transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Pull & Restart
              </button>
            </div>
          </div>

          {/* Status message */}
          {actionStatus && (
            <div
              className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                actionStatus.type === "success"
                  ? "bg-emerald-900/30 border border-emerald-800 text-emerald-300"
                  : "bg-red-900/30 border border-red-800 text-red-300"
              }`}
            >
              {actionStatus.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {actionStatus.message}
            </div>
          )}
        </header>

        {/* Tab navigation */}
        <nav className="mb-4 flex gap-1 border-b border-neutral-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-cyan-400 text-cyan-400"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 min-h-[500px]">
          {activeTab === "logs" && (
            <StackLogs stackName={stackName} services={stack.services} containers={stack.containers} />
          )}
          {activeTab === "terminal" && (
            <WebTerminal containers={stack.containers} />
          )}
          {activeTab === "compose" && (
            <ComposeEditor stackName={stackName} />
          )}
          {activeTab === "diff" && (
            <StackDiffView stackName={stackName} onApply={() => handleAction("recreate")} />
          )}
        </div>
      </div>
    </main>
  );
}
