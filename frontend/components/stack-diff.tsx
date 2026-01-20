"use client";

import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Play } from "lucide-react";
import { StackDiff, ContainerInfo } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_STACKVIEW_API ?? "http://localhost:8080";

interface StackDiffViewProps {
  stackName: string;
  onApply: () => void;
}

export function StackDiffView({ stackName, onApply }: StackDiffViewProps) {
  const [diff, setDiff] = useState<StackDiff | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchDiff = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/stacks/${stackName}/diff`);
      if (!res.ok) throw new Error("Failed to load diff");
      const data: StackDiff = await res.json();
      setDiff(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiff();
  }, [stackName]);

  const handleApply = () => {
    setShowConfirm(false);
    onApply();
    setTimeout(fetchDiff, 2000); // Refresh after applying
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] text-neutral-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Analyzing differences...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-red-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{error}</p>
        <button
          onClick={fetchDiff}
          className="mt-4 text-cyan-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!diff) return null;

  return (
    <div className="p-6">
      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <h3 className="text-lg font-semibold">Confirm Apply Changes</h3>
            </div>
            <p className="text-neutral-400 text-sm mb-4">
              This will recreate all containers to match the compose file configuration.
              Running containers will be stopped and restarted.
            </p>
            {diff.missingServices.length > 0 && (
              <p className="text-sm text-emerald-400 mb-2">
                + {diff.missingServices.length} service(s) will be started
              </p>
            )}
            {diff.extraContainers.length > 0 && (
              <p className="text-sm text-red-400 mb-2">
                - {diff.extraContainers.length} container(s) will be removed
              </p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-500 transition-colors flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${
          diff.hasDifferences
            ? "bg-amber-900/20 border border-amber-800"
            : "bg-emerald-900/20 border border-emerald-800"
        }`}
      >
        {diff.hasDifferences ? (
          <>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-medium text-amber-300">Differences detected</p>
              <p className="text-sm text-amber-400/80">
                The running state differs from the compose file configuration.
              </p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="font-medium text-emerald-300">In sync</p>
              <p className="text-sm text-emerald-400/80">
                Running containers match the compose file configuration.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Comparison */}
      <div className="grid grid-cols-2 gap-6">
        {/* Compose File */}
        <div>
          <h3 className="text-sm font-medium text-neutral-400 mb-3">
            Compose File Services
          </h3>
          <div className="space-y-2">
            {diff.composeServices.map((svc) => {
              const isRunning = diff.runningServices.includes(svc);
              return (
                <div
                  key={svc}
                  className={`flex items-center justify-between p-3 rounded border ${
                    isRunning
                      ? "border-neutral-700 bg-neutral-800/50"
                      : "border-amber-700 bg-amber-900/20"
                  }`}
                >
                  <span className="font-mono text-sm">{svc}</span>
                  {!isRunning && (
                    <span className="text-xs text-amber-400">Not Running</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Running Containers */}
        <div>
          <h3 className="text-sm font-medium text-neutral-400 mb-3">
            Running Containers
          </h3>
          <div className="space-y-2">
            {diff.containers.map((c) => {
              const isInCompose = diff.composeServices.includes(c.service);
              return (
                <div
                  key={c.id}
                  className={`flex items-center justify-between p-3 rounded border ${
                    isInCompose
                      ? "border-neutral-700 bg-neutral-800/50"
                      : "border-red-700 bg-red-900/20"
                  }`}
                >
                  <div>
                    <span className="font-mono text-sm">{c.service}</span>
                    <span className="text-neutral-500 text-xs ml-2">
                      {c.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        c.status === "running" ? "bg-emerald-400" : "bg-neutral-500"
                      }`}
                    />
                    {!isInCompose && (
                      <span className="text-xs text-red-400">Not in Compose</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Apply Button */}
      {diff.hasDifferences && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-cyan-600 text-white hover:bg-cyan-500 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Apply Changes
          </button>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={fetchDiff}
          disabled={isLoading}
          className="flex items-center gap-1 text-sm text-neutral-400 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
