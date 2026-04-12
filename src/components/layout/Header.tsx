"use client";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Bot, LogOut, Menu, User } from "lucide-react";
import toast from "react-hot-toast";
import { useUIStore } from "@/store/ui";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Tasks",
  "/dashboard/tasks": "Tasks",
  "/money": "Money",
  "/dashboard/money": "Money",
  "/learning": "Learning",
  "/dashboard/learning": "Learning",
  "/notes": "Notes",
  "/dashboard/notes": "Notes",
  "/habits": "Habits",
  "/dashboard/habits": "Habits",
  "/goals": "Goals",
  "/dashboard/goals": "Goals",
  "/devices": "Devices",
  "/dashboard/devices": "Devices",
};

interface HeaderProps {
  userEmail?: string;
  userName?: string;
}

export function Header({ userEmail, userName }: HeaderProps) {
  const pathname = usePathname();
  const { toggleAIChat, toggleMobileSidebar } = useUIStore();
  const title = TITLES[pathname] ?? "Veritus";

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    await fetch("/api/auth/session", { method: "DELETE" });

    toast.success("Signed out");
    window.location.assign("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 border-b border-surface-border bg-bg-primary/72 backdrop-blur-xl">
      <div className="flex h-[74px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-border bg-white/5 text-slate-200 md:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-cyan/70">
              Veritus OS
            </p>
            <h1 className="truncate text-lg font-semibold text-white md:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAIChat}
            className="flex h-11 items-center gap-2 rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-3 text-brand-cyan transition-colors hover:bg-brand-cyan/15"
            aria-label="Open AI assistant"
          >
            <Bot size={16} />
            <span className="hidden text-sm font-medium sm:inline">AI</span>
          </button>

          <button
            className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-surface-border bg-white/5 text-slate-400 transition-colors hover:text-white sm:flex"
            aria-label="Notifications"
          >
            <Bell size={16} />
          </button>

          <div className="flex items-center gap-2 rounded-[22px] border border-surface-border bg-white/5 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white">
              <User size={14} />
            </div>
            <div className="hidden md:block">
              <p className="max-w-[140px] truncate text-xs font-medium text-white">
                {userName ?? "User"}
              </p>
              <p className="max-w-[160px] truncate text-[11px] text-slate-500">
                {userEmail}
              </p>
            </div>
            <button
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center rounded-2xl text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-400"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 sm:px-6">
        <p className="text-xs text-slate-500">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </header>
  );
}
