"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { ComposeContent } from "../lib/types";

import { API_BASE as API_URL } from "../lib/api-config";

interface ComposeEditorProps {
  stackName: string;
}

export function ComposeEditor({ stackName }: ComposeEditorProps) {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [path, setPath] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null);

  const fetchCompose = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/stacks/${stackName}/compose`);
      if (!res.ok) throw new Error("Failed to load compose file");
      const data: ComposeContent = await res.json();
      setContent(data.content);
      setOriginalContent(data.content);
      setPath(data.path);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompose();
  }, [stackName]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/stacks/${stackName}/compose`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveStatus("success");
      setOriginalContent(content);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("error");
      setError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = content !== originalContent;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px] text-neutral-400">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading compose file...
      </div>
    );
  }

  if (error && !content) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] text-red-400">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{error}</p>
        <button
          onClick={fetchCompose}
          className="mt-4 text-cyan-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="text-sm text-neutral-400 font-mono truncate max-w-md">
          {path}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "success" && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              Save failed
            </span>
          )}
          <button
            onClick={fetchCompose}
            disabled={isLoading}
            className="flex items-center gap-1 rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Reload
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={`flex items-center gap-1 rounded border px-3 py-1 text-sm transition-colors disabled:opacity-50 ${
              hasChanges
                ? "border-emerald-600 text-emerald-400 hover:bg-emerald-900/30"
                : "border-neutral-700 text-neutral-500"
            }`}
          >
            <Save className={`h-3 w-3 ${isSaving ? "animate-spin" : ""}`} />
            Save
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full resize-none bg-neutral-950 p-4 font-mono text-sm text-neutral-200 focus:outline-none"
          spellCheck={false}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}
