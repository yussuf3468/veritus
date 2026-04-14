"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, CheckSquare, Flame, LayoutDashboard, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

const dockItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/money", label: "Money", icon: Wallet },
  { href: "/dashboard/habits", label: "Habits", icon: Flame },
];

export function MobileDock() {
  const pathname = usePathname();
  const { aiChatOpen, toggleAIChat } = useUIStore();
  const aiActive =
    aiChatOpen ||
    pathname === "/dashboard/ai" ||
    pathname.startsWith("/dashboard/ai/");

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div
        className="mx-auto max-w-[420px] px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.65rem)" }}
      >
        <motion.div
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,34,0.95),rgba(10,11,20,0.92))] px-2 pb-2 pt-7 shadow-[0_16px_42px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        >
          <div className="ai-grid-surface absolute inset-0 opacity-50" />
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              {aiActive && (
                <span className="ai-orb-drift-cyan absolute inset-0 rounded-[18px] bg-brand-cyan/20 blur-[18px]" />
              )}
              <button
                onClick={toggleAIChat}
                className={cn(
                  "pointer-events-auto relative flex h-12 w-12 items-center justify-center rounded-[16px] border shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-transform hover:-translate-y-0.5",
                  aiActive
                    ? "border-brand-cyan/24 bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow"
                    : "border-white/10 bg-white/[0.08] text-white",
                )}
                aria-label="Open AI assistant"
              >
                <Bot size={16} />
              </button>
            </div>
          </div>

          <div className="relative mb-1 flex items-center justify-center">
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.16em]",
                aiActive
                  ? "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan"
                  : "border-white/8 bg-white/[0.03] text-slate-500",
              )}
            >
              {aiActive ? "AI live" : "AI dock"}
            </span>
          </div>

          <div className="relative grid grid-cols-4 gap-1.5">
            {dockItems.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[16px] px-1.5 py-2 text-[10px] font-medium transition-all",
                    active
                      ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Icon size={17} className={active ? "text-brand-cyan" : ""} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
