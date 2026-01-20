"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Clock,
  Settings,
} from "lucide-react";

import { API_BASE } from "../lib/api-config";

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

type Alert = {
  id: number;
  ruleId: number;
  ruleName: string;
  containerId?: string;
  stackName?: string;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: string;
  resolved: boolean;
  resolvedAt?: string;
};

const RULE_PRESETS = [
  {
    name: "Container Restarts",
    type: "restart_threshold" as const,
    threshold: 3,
    duration: "10m",
  },
  {
    name: "High CPU Usage",
    type: "cpu_threshold" as const,
    threshold: 90,
    duration: "5m",
  },
  {
    name: "High Memory Usage",
    type: "mem_threshold" as const,
    threshold: 85,
    duration: "5m",
  },
];

export function AlertBadge() {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alerts/active`);
        if (res.ok) {
          const data = await res.json();
          setActiveAlerts(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const alertCount = activeAlerts.length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          alertCount > 0
            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
        }`}
      >
        {alertCount > 0 ? (
          <Bell className="w-4 h-4 animate-pulse" />
        ) : (
          <BellOff className="w-4 h-4" />
        )}
        {alertCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs rounded-full">
            {alertCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-neutral-800 bg-neutral-900 shadow-xl z-50">
          <div className="p-4 border-b border-neutral-800">
            <h3 className="font-medium text-neutral-100">Active Alerts</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {activeAlerts.length === 0 ? (
              <div className="p-6 text-center text-neutral-500">
                <Check className="w-8 h-8 mx-auto mb-2" />
                No active alerts
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {activeAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 hover:bg-neutral-800/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm text-neutral-200">{alert.ruleName}</div>
                        <div className="text-xs text-neutral-500">{alert.message}</div>
                        {alert.stackName && (
                          <div className="text-xs text-cyan-400 mt-1">{alert.stackName}</div>
                        )}
                        <div className="text-xs text-neutral-600 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AlertConfig() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<AlertRule>({
    name: "",
    type: "cpu_threshold",
    threshold: 90,
    duration: "5m",
    enabled: true,
    webhookUrl: "",
    email: "",
  });

  useEffect(() => {
    fetchRules();
    fetchHistory();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/alerts`);
      if (res.ok) {
        const data = await res.json();
        setRules(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts/history?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch alert history:", err);
    }
  };

  const addRule = async () => {
    if (!newRule.name) return;
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule),
      });
      if (res.ok) {
        setShowAddForm(false);
        setNewRule({
          name: "",
          type: "cpu_threshold",
          threshold: 90,
          duration: "5m",
          enabled: true,
          webhookUrl: "",
          email: "",
        });
        fetchRules();
      }
    } catch (err) {
      console.error("Failed to add rule:", err);
    }
  };

  const toggleRule = async (rule: AlertRule) => {
    try {
      await fetch(`${API_BASE}/api/onboarding/alerts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
      });
      fetchRules();
    } catch (err) {
      console.error("Failed to toggle rule:", err);
    }
  };

  const deleteRule = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/onboarding/alerts/${id}`, {
        method: "DELETE",
      });
      fetchRules();
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const applyPreset = (preset: typeof RULE_PRESETS[0]) => {
    setNewRule({
      ...newRule,
      name: preset.name,
      type: preset.type,
      threshold: preset.threshold,
      duration: preset.duration,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500">
        <Settings className="w-5 h-5 animate-spin mr-2" />
        Loading alert configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Rules */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h3 className="font-medium text-neutral-100">Alert Rules</h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {showAddForm && (
          <div className="p-4 bg-neutral-800/50 border-b border-neutral-800">
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="text-sm text-neutral-500">Presets:</span>
                {RULE_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded text-neutral-200 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="Rule name"
                  className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500"
                />
                <select
                  value={newRule.type}
                  onChange={(e) => setNewRule({ ...newRule, type: e.target.value as AlertRule["type"] })}
                  className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                >
                  <option value="cpu_threshold">CPU Threshold</option>
                  <option value="mem_threshold">Memory Threshold</option>
                  <option value="restart_threshold">Restart Threshold</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })}
                    className="w-24 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  />
                  <span className="text-neutral-500">
                    {newRule.type === "restart_threshold" ? "restarts" : "%"}
                  </span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-neutral-500">for</span>
                  <input
                    type="text"
                    value={newRule.duration}
                    onChange={(e) => setNewRule({ ...newRule, duration: e.target.value })}
                    placeholder="5m"
                    className="w-20 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <input
                type="text"
                value={newRule.webhookUrl || ""}
                onChange={(e) => setNewRule({ ...newRule, webhookUrl: e.target.value })}
                placeholder="Webhook URL (optional)"
                className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={addRule}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
                >
                  Add Rule
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-neutral-800">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No alert rules configured
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/30">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleRule(rule)}
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
                  <div>
                    <div className="text-neutral-200 font-medium">{rule.name}</div>
                    <div className="text-xs text-neutral-500">
                      {rule.type === "restart_threshold"
                        ? `${rule.threshold} restarts`
                        : `${rule.threshold}%`}{" "}
                      in {rule.duration}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => rule.id && deleteRule(rule.id)}
                  className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert History */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="p-4 border-b border-neutral-800">
          <h3 className="font-medium text-neutral-100">Alert History</h3>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-neutral-800">
          {history.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No alert history
            </div>
          ) : (
            history.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-neutral-800/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {alert.resolved ? (
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm text-neutral-200">{alert.ruleName}</div>
                      <div className="text-xs text-neutral-500">{alert.message}</div>
                      {alert.stackName && (
                        <div className="text-xs text-cyan-400 mt-1">{alert.stackName}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600">
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
