"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Box, 
  Database, 
  Settings, 
  Github, 
  Terminal,
  Activity,
  ChevronLeft,
  Search,
  Command
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/containers", label: "Containers", icon: Box },
  { href: "/volumes", label: "Volumes", icon: Database },
  { href: "/logs", label: "System Logs", icon: Terminal },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`transition-all duration-300 ease-in-out ${collapsed ? "w-20" : "w-72"} border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 h-screen sticky top-0 flex flex-col z-50`}>
      {/* Sidebar Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-brand-600 p-2.5 rounded-2xl shadow-lg shadow-brand-600/30">
            <Activity className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <span className="font-extrabold text-xl tracking-tight text-surface-900 dark:text-white">
              Stack<span className="text-brand-600">View</span>
            </span>
          )}
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all text-surface-400"
        >
          <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Global Search Trigger (Placeholder for 10x feel) */}
      {!collapsed && (
        <div className="px-6 mb-8">
          <button className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-surface-400 hover:border-brand-500/50 transition-all text-sm group">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="font-medium">Quick find...</span>
            </div>
            <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
              <Command className="h-3 w-3" />
              <span className="text-xs font-bold">K</span>
            </div>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-all duration-200 group relative ${
                isActive 
                  ? "bg-brand-50/80 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400" 
                  : "text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-900 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              <item.icon className={`h-5 w-5 transition-colors ${isActive ? "text-brand-600" : "text-surface-400 group-hover:text-surface-900 dark:group-hover:text-white"}`} />
              {!collapsed && <span>{item.label}</span>}
              {isActive && !collapsed && (
                <div className="absolute right-4 w-1.5 h-1.5 bg-brand-600 rounded-full shadow-sm" />
              )}
              {collapsed && (
                 <div className="absolute left-full ml-4 px-3 py-1 bg-surface-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-bold">
                   {item.label}
                 </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 space-y-1 border-t border-surface-100 dark:border-surface-900">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-900 hover:text-surface-900 dark:hover:text-white transition-all group"
        >
          <Settings className="h-5 w-5 text-surface-400 group-hover:text-brand-500" />
          {!collapsed && <span>Settings</span>}
        </Link>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-semibold text-surface-400 hover:text-surface-900 dark:hover:text-white transition-all"
        >
          <Github className="h-5 w-5" />
          {!collapsed && <span>Documentation</span>}
        </a>
      </div>
    </aside>
  );
}

