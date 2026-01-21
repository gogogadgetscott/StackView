"use client";

export const getApiBase = () => {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return process.env.NEXT_PUBLIC_STACKVIEW_API ?? "http://localhost:8080";
};

export const getWsBase = (path: string = "/ws/stats") => {
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8080${path}`;
  }
  return (process.env.NEXT_PUBLIC_STACKVIEW_WS ?? "ws://localhost:8080") + path;
};

export const API_BASE = getApiBase();
export const WS_STATS_URL = getWsBase("/ws/stats");
export const WS_LOGS_URL = getWsBase("/ws/logs");
export const WS_EXEC_URL = getWsBase("/ws/exec");

export const checkBackendStatus = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/api/stacks`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};
