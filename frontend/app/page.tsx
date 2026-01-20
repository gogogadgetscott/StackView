import { ContainerTable } from "../components/container-table";

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">StackView</p>
            <h1 className="text-3xl font-semibold">Containers</h1>
            <p className="text-sm text-neutral-400">Unified view of runtime, stacks, and live telemetry.</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
            Realtime stats via WebSocket · 1s cadence
          </div>
        </header>
        <ContainerTable />
      </div>
    </main>
  );
}
