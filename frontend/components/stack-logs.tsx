"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Filter } from "lucide-react";
import { ContainerInfo, LogEntry } from "../lib/types";

const WS_URL = process.env.NEXT_PUBLIC_STACKVIEW_WS ?? "ws://localhost:8080";

interface StackLogsProps {
  stackName: string;
  services: string[];
  containers: ContainerInfo[];
}

export function StackLogs({ stackName, services, containers }: StackLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/ws/logs`);

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          stackName,
          services: selectedService ? [selectedService] : [],
          tail: "100",
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message) {
        setLogs((prev) => [...prev.slice(-500), data as LogEntry]);
      }
    };

    socket.onerror = (err) => console.error("logs ws error", err);

    return () => socket.close();
  }, [stackName, selectedService]);

  useEffect(() => {
    if (!isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isPaused]);

  const filteredLogs = selectedService
    ? logs.filter((log) => log.service === selectedService)
    : logs;

  const serviceColors: Record<string, string> = {};
  const colorPalette = [
    "text-cyan-400",
    "text-emerald-400",
    "text-purple-400",
    "text-amber-400",
    "text-pink-400",
    "text-blue-400",
  ];
  services.forEach((svc, i) => {
    serviceColors[svc] = colorPalette[i % colorPalette.length];
  });

  return (
    <div className="flex flex-col h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-500" />
          <select
            value={selectedService ?? ""}
            onChange={(e) => setSelectedService(e.target.value || null)}
            className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">All Services</option>
            {services.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`flex items-center gap-2 rounded border px-3 py-1 text-sm transition-colors ${
            isPaused
              ? "border-emerald-600 text-emerald-400 hover:bg-emerald-900/30"
              : "border-neutral-700 text-neutral-400 hover:border-amber-500 hover:text-amber-400"
          }`}
        >
          {isPaused ? (
            <>
              <Play className="h-3 w-3" />
              Resume
            </>
          ) : (
            <>
              <Pause className="h-3 w-3" />
              Pause
            </>
          )}
        </button>
      </div>

      {/* Logs */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto font-mono text-xs p-4 bg-neutral-950"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">
            Waiting for logs...
          </div>
        ) : (
          filteredLogs.map((log, i) => (
            <div
              key={i}
              className={`py-0.5 hover:bg-neutral-800/50 ${
                log.stream === "stderr" ? "text-red-300" : "text-neutral-300"
              }`}
            >
              <span className="text-neutral-600 mr-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`mr-2 ${serviceColors[log.service] ?? "text-neutral-400"}`}>
                [{log.service}]
              </span>
              <span>{log.message}</span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
