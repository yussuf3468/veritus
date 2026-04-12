"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bot,
  CheckSquare,
  DollarSign,
  Flame,
  LayoutDashboard,
} from "lucide-react";
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
        className="mx-auto max-w-[420px] px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.65rem)" }}
      >
        <motion.div
          initial={{ y: 22, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="pointer-events-auto relative rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,20,34,0.94),rgba(10,11,20,0.92))] px-2 pb-2 pt-7 shadow-[0_16px_42px_rgba(0,0,0,0.32)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
            <button
              onClick={toggleAIChat}
              className={cn(
                "pointer-events-auto flex h-12 w-12 items-center justify-center rounded-[16px] border shadow-[0_12px_30px_rgba(0,0,0,0.28)] transition-transform hover:-translate-y-0.5",
                aiChatOpen
                  ? "border-white/10 bg-white/[0.08] text-white"
                  : "border-brand-cyan/20 bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow",
              )}
              aria-label="Open AI assistant"
            >
              <Bot size={16} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
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
