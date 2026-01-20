"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { ContainerInfo } from "../lib/types";

import { WS_EXEC_URL as WS_URL } from "../lib/api-config";

interface WebTerminalProps {
  containers: ContainerInfo[];
}

export function WebTerminal({ containers }: WebTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [selectedContainer, setSelectedContainer] = useState<string>(
    containers[0]?.id ?? ""
  );
  const [isConnected, setIsConnected] = useState(false);
  const [terminalContent, setTerminalContent] = useState<string[]>([]);
  const [inputLine, setInputLine] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedContainer) return;

    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          containerId: selectedContainer,
          cmd: "/bin/sh",
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "ready") {
        setIsConnected(true);
        setTerminalContent((prev) => [...prev, "Connected to container\r\n"]);
      } else if (data.type === "output") {
        setTerminalContent((prev) => [...prev, data.data]);
      } else if (data.error) {
        setTerminalContent((prev) => [...prev, `Error: ${data.error}\r\n`]);
      }
    };

    socket.onerror = () => {
      setTerminalContent((prev) => [...prev, "Connection error\r\n"]);
    };

    socket.onclose = () => {
      setIsConnected(false);
      setTerminalContent((prev) => [...prev, "Disconnected\r\n"]);
    };

    return () => {
      socket.close();
    };
  }, [selectedContainer]);

  // Scroll to bottom on new content
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalContent]);

  const handleInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "input",
          data: inputLine + "\n",
        })
      );
      setInputLine("");
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const selectedContainerInfo = containers.find((c) => c.id === selectedContainer);

  return (
    <div className="flex flex-col h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-neutral-500" />
          <select
            value={selectedContainer}
            onChange={(e) => {
              setSelectedContainer(e.target.value);
              setTerminalContent([]);
              setIsConnected(false);
            }}
            className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none max-w-xs"
          >
            {containers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.service})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-emerald-400" : "bg-neutral-500"
            }`}
          />
          <span className="text-neutral-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        onClick={focusInput}
        className="flex-1 overflow-auto bg-neutral-950 font-mono text-sm text-green-400 p-4 cursor-text"
      >
        {containers.length === 0 ? (
          <div className="text-neutral-500 text-center py-8">
            No running containers
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap">
              {terminalContent.join("")}
            </div>
            <div className="flex items-center">
              <span className="text-cyan-400">
                {selectedContainerInfo?.name ?? "container"}
              </span>
              <span className="text-neutral-500">:# </span>
              <input
                ref={inputRef}
                type="text"
                value={inputLine}
                onChange={(e) => setInputLine(e.target.value)}
                onKeyDown={handleInput}
                disabled={!isConnected}
                className="flex-1 bg-transparent outline-none text-green-400"
                autoFocus
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
