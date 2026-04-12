"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, CheckSquare, DollarSign, Flame, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

const dockItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/money", label: "Money", icon: DollarSign },
  { href: "/dashboard/habits", label: "Habits", icon: Flame },
];

export function MobileDock() {
  const pathname = usePathname();
  const { aiChatOpen, toggleAIChat } = useUIStore();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div
        className="mx-auto max-w-md px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <motion.div
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto rounded-[28px] border border-surface-border bg-bg-panel/90 p-2 shadow-panel backdrop-blur-2xl"
        >
          <div className="grid grid-cols-5 gap-1">
            {dockItems.slice(0, 2).map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all",
                    active
                      ? "bg-brand-cyan/12 text-brand-cyan"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}

            <button
              onClick={toggleAIChat}
              className={cn(
                "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[22px] px-2 py-2 text-[11px] font-semibold transition-all",
                aiChatOpen
                  ? "border border-surface-border bg-white/5 text-white"
                  : "bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow",
              )}
              aria-label="Open AI assistant"
            >
              <Bot size={18} />
              <span>AI</span>
            </button>

            {dockItems.slice(2).map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all",
                    active
                      ? "bg-brand-cyan/12 text-brand-cyan"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon size={18} />
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