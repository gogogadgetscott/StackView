"use client";

import { Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-8 shadow-xl shadow-black/40">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <p className="text-neutral-400 max-w-2xl">
            This area is reserved for future configuration options. For now, all controls are available directly on stacks and containers.
          </p>
        </div>
      </div>
    </main>
  );
}
