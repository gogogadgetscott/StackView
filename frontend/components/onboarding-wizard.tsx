"use client";

import { useEffect, useState } from "react";
import { ChevronRight, FolderOpen, Server, Bell, Check, ArrowRight } from "lucide-react";

type OnboardingStatus = {
  completed: boolean;
  step: number;
  stackRoots: string[];
  hosts: Host[];
  alertRules: AlertRule[];
};

type Host = {
  id?: number;
  name: string;
  address: string;
  port: number;
  tlsEnabled: boolean;
};

type AlertRule = {
  id?: number;
  name: string;
  type: "restart_threshold" | "cpu_threshold" | "mem_threshold";
  threshold: number;
  duration: string;
  enabled: boolean;
  webhookUrl?: string;
  email?: string;
};

import { API_BASE } from "../lib/api-config";

const STEPS = [
  { id: 0, title: "Welcome", icon: Check },
  { id: 1, title: "Stack Directories", icon: FolderOpen },
  { id: 2, title: "Remote Hosts", icon: Server },
  { id: 3, title: "Alerts", icon: Bell },
  { id: 4, title: "Complete", icon: Check },
];

const PRESET_ALERTS: AlertRule[] = [
  {
    name: "Container Restarts",
    type: "restart_threshold",
    threshold: 3,
    duration: "10m",
    enabled: true,
  },
  {
    name: "High CPU Usage",
    type: "cpu_threshold",
    threshold: 90,
    duration: "5m",
    enabled: true,
  },
  {
    name: "High Memory Usage",
    type: "mem_threshold",
    threshold: 85,
    duration: "5m",
    enabled: false,
  },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              i < currentStep
                ? "bg-emerald-500 text-white"
                : i === currentStep
                ? "bg-cyan-500 text-white scale-110"
                : "bg-neutral-800 text-neutral-500"
            }`}
          >
            {i < currentStep ? (
              <Check className="w-5 h-5" />
            ) : (
              <step.icon className="w-5 h-5" />
            )}
          </div>
          {i < STEPS.length - 1 && (
            <ChevronRight className="w-5 h-5 mx-2 text-neutral-600" />
          )}
        </div>
      ))}
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center max-w-xl mx-auto">
      <h2 className="text-3xl font-bold text-white mb-4">Welcome to StackView</h2>
      <p className="text-neutral-400 mb-6">
        A compose-first Docker manager with live telemetry and observability.
      </p>
      <div className="bg-neutral-800/50 rounded-xl p-6 mb-8 text-left">
        <h3 className="text-lg font-medium text-cyan-400 mb-4">Philosophy</h3>
        <ul className="space-y-3 text-neutral-300">
          <li className="flex items-start gap-3">
            <span className="text-emerald-400">✓</span>
            <span><strong>No Hidden State</strong> — Everything is compose files and labels</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400">✓</span>
            <span><strong>Observability First</strong> — Real-time stats, historical graphs, alerts</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400">✓</span>
            <span><strong>Speed & Low Friction</strong> — One-glance dashboard, minimal clicks</span>
          </li>
        </ul>
      </div>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
      >
        Get Started <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function StackRootsStep({
  stackRoots,
  setStackRoots,
  onNext,
  onBack,
}: {
  stackRoots: string[];
  setStackRoots: (roots: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [newRoot, setNewRoot] = useState("");

  const addRoot = () => {
    if (newRoot && !stackRoots.includes(newRoot)) {
      setStackRoots([...stackRoots, newRoot]);
      setNewRoot("");
    }
  };

  const removeRoot = (root: string) => {
    setStackRoots(stackRoots.filter((r) => r !== root));
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Stack Directories</h2>
      <p className="text-neutral-400 mb-6">
        Add directories where your docker-compose files are located.
      </p>

      <div className="space-y-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoot}
            onChange={(e) => setNewRoot(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRoot()}
            placeholder="/home/user/docker"
            className="flex-1 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={addRoot}
            className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
          >
            Add
          </button>
        </div>

        {stackRoots.length > 0 && (
          <div className="space-y-2">
            {stackRoots.map((root) => (
              <div
                key={root}
                className="flex items-center justify-between px-4 py-3 bg-neutral-800 rounded-lg"
              >
                <span className="text-neutral-200 font-mono text-sm">{root}</span>
                <button
                  onClick={() => removeRoot(root)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {stackRoots.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            No directories added yet
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={stackRoots.length === 0}
          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-medium rounded-lg transition-colors"
        >
          Next <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function HostsStep({
  hosts,
  setHosts,
  onNext,
  onBack,
}: {
  hosts: Host[];
  setHosts: (hosts: Host[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newHost, setNewHost] = useState<Host>({
    name: "",
    address: "",
    port: 2376,
    tlsEnabled: true,
  });

  const addHost = () => {
    if (newHost.name && newHost.address) {
      setHosts([...hosts, newHost]);
      setNewHost({ name: "", address: "", port: 2376, tlsEnabled: true });
      setShowForm(false);
    }
  };

  const removeHost = (index: number) => {
    setHosts(hosts.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Remote Hosts</h2>
      <p className="text-neutral-400 mb-6">
        Optionally connect additional Docker hosts for multi-host monitoring.
      </p>

      <div className="space-y-4 mb-6">
        {hosts.map((host, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 bg-neutral-800 rounded-lg"
          >
            <div>
              <div className="text-neutral-200 font-medium">{host.name}</div>
              <div className="text-neutral-500 text-sm">
                {host.address}:{host.port}
              </div>
            </div>
            <button
              onClick={() => removeHost(i)}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
        ))}

        {showForm ? (
          <div className="p-4 bg-neutral-800 rounded-lg space-y-3">
            <input
              type="text"
              value={newHost.name}
              onChange={(e) => setNewHost({ ...newHost, name: e.target.value })}
              placeholder="Host name"
              className="w-full px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newHost.address}
                onChange={(e) => setNewHost({ ...newHost, address: e.target.value })}
                placeholder="192.168.1.100"
                className="flex-1 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="number"
                value={newHost.port}
                onChange={(e) => setNewHost({ ...newHost, port: parseInt(e.target.value) })}
                className="w-24 px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newHost.tlsEnabled}
                onChange={(e) => setNewHost({ ...newHost, tlsEnabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-neutral-300">Enable TLS</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-neutral-400 hover:text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={addHost}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
              >
                Add Host
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-neutral-700 hover:border-neutral-600 rounded-lg text-neutral-400 hover:text-neutral-300 transition-colors"
          >
            + Add Remote Host
          </button>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
        >
          {hosts.length > 0 ? "Next" : "Skip"} <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function AlertsStep({
  alertRules,
  setAlertRules,
  onNext,
  onBack,
}: {
  alertRules: AlertRule[];
  setAlertRules: (rules: AlertRule[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const toggleRule = (index: number) => {
    const updated = [...alertRules];
    updated[index].enabled = !updated[index].enabled;
    setAlertRules(updated);
  };

  const updateThreshold = (index: number, threshold: number) => {
    const updated = [...alertRules];
    updated[index].threshold = threshold;
    setAlertRules(updated);
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-2">Alert Rules</h2>
      <p className="text-neutral-400 mb-6">
        Configure basic alert rules for container monitoring.
      </p>

      <div className="space-y-4 mb-6">
        {alertRules.map((rule, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg border transition-colors ${
              rule.enabled
                ? "bg-neutral-800 border-cyan-500/50"
                : "bg-neutral-800/50 border-neutral-700"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleRule(i)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    rule.enabled ? "bg-cyan-500" : "bg-neutral-600"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      rule.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-neutral-200 font-medium">{rule.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-neutral-500">Threshold:</span>
              <input
                type="number"
                value={rule.threshold}
                onChange={(e) => updateThreshold(i, parseFloat(e.target.value))}
                disabled={!rule.enabled}
                className="w-20 px-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-white disabled:opacity-50"
              />
              <span className="text-neutral-500">
                {rule.type === "restart_threshold" ? "restarts" : "%"} in {rule.duration}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg transition-colors"
        >
          Next <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center max-w-xl mx-auto">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check className="w-10 h-10 text-emerald-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-4">You're All Set!</h2>
      <p className="text-neutral-400 mb-8">
        StackView is ready to monitor your Docker stacks with live telemetry and observability.
      </p>
      <button
        onClick={onComplete}
        className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors text-lg"
      >
        Open Dashboard <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [stackRoots, setStackRoots] = useState<string[]>(["/stacks"]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>(PRESET_ALERTS);
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      // Save stack roots
      await fetch(`${API_BASE}/api/onboarding/stack-roots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roots: stackRoots }),
      });

      // Save hosts
      for (const host of hosts) {
        await fetch(`${API_BASE}/api/onboarding/hosts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(host),
        });
      }

      // Save alert rules
      for (const rule of alertRules.filter((r) => r.enabled)) {
        await fetch(`${API_BASE}/api/onboarding/alerts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rule),
        });
      }

      // Mark complete
      await fetch(`${API_BASE}/api/onboarding/complete`, { method: "POST" });

      onComplete();
    } catch (err) {
      console.error("Failed to save onboarding:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <StepIndicator currentStep={step} />

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && (
            <StackRootsStep
              stackRoots={stackRoots}
              setStackRoots={setStackRoots}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <HostsStep
              hosts={hosts}
              setHosts={setHosts}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <AlertsStep
              alertRules={alertRules}
              setAlertRules={setAlertRules}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <CompleteStep onComplete={handleComplete} />
          )}
        </div>

        {saving && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-neutral-900 p-6 rounded-xl text-white">
              Saving configuration...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/onboarding/status`)
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}
