import { ContainerTable } from "../components/container-table";
import { StackList } from "../components/stack-card";

export default function Page() {
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50">
      <div className="mx-auto max-w-full px-6 py-10">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-neutral-400">StackView</p>
            <h1 className="text-3xl font-semibold">Stacks & Containers</h1>
            <p className="text-sm text-neutral-400">
              Unified view of compose stacks, runtime status, and live telemetry.
            </p>
          </div>
          {/* Status Pill */}
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/50 px-3 py-1.5 text-xs text-neutral-300">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            <span>Connected</span>
          </div>
        </header>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Left Column: Stacks - 1/3 width */}
          <div className="col-span-1 flex flex-col min-h-0">
            <h2 className="mb-4 text-lg font-semibold text-neutral-200">Stacks</h2>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700">
              <StackList />
            </div>
          </div>

          {/* Right Column: All Containers - 2/3 width */}
          <div className="col-span-2 flex flex-col min-h-0">
            <h2 className="mb-4 text-lg font-semibold text-neutral-200">All Containers</h2>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700">
              <ContainerTable />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

