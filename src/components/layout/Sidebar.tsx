"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  CheckSquare,
  DollarSign,
  BookOpen,
  FileText,
  Activity,
  Target,
  Monitor,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Your command view",
  },
  {
    href: "/dashboard/tasks",
    icon: CheckSquare,
    label: "Tasks",
    description: "Plan and execute",
  },
  {
    href: "/dashboard/money",
    icon: DollarSign,
    label: "Money",
    description: "Cashflow and savings",
  },
  {
    href: "/dashboard/learning",
    icon: BookOpen,
    label: "Learning",
    description: "Skill sessions",
  },
  {
    href: "/dashboard/notes",
    icon: FileText,
    label: "Notes",
    description: "Capture ideas",
  },
  {
    href: "/dashboard/habits",
    icon: Activity,
    label: "Habits",
    description: "Daily rhythm",
  },
  {
    href: "/dashboard/goals",
    icon: Target,
    label: "Goals",
    description: "Longer horizons",
  },
  {
    href: "/dashboard/devices",
    icon: Monitor,
    label: "Devices",
    description: "Connected gear",
  },
];

interface NavLinksProps {
  pathname: string;
  showLabels: boolean;
  onNavigate?: () => void;
  indicatorId: string;
}

function NavLinks({
  pathname,
  showLabels,
  onNavigate,
  indicatorId,
}: NavLinksProps) {
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4">
      {navItems.map(({ href, icon: Icon, label, description }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-[20px] px-3 py-2.5 transition-all duration-200",
              active
                ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_30px_rgba(0,212,255,0.08)]"
                : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
            )}
          >
            {active && (
              <motion.div
                layoutId={indicatorId}
                className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-brand-cyan to-brand-purple"
              />
            )}
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {showLabels && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0"
                >
                  <p className="truncate text-sm font-medium whitespace-nowrap">
                    {label}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {description}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {!showLabels && (
              <div className="pointer-events-none absolute left-full ml-3 rounded-xl border border-surface-border bg-bg-elevated px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                {label}
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarOpen,
    toggleSidebar,
    mobileSidebarOpen,
    setMobileSidebar,
    setAIChat,
  } = useUIStore();

  useEffect(() => {
    setMobileSidebar(false);
  }, [pathname, setMobileSidebar]);

  return (
    <>
      <motion.aside
        animate={{ width: sidebarOpen ? 272 : 88 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative hidden flex-shrink-0 md:block"
      >
        <div className="sticky top-3 h-[calc(100vh-1.5rem)] sm:top-4 sm:h-[calc(100vh-2rem)]">
          <div className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(17,18,32,0.94),rgba(9,10,18,0.92))] shadow-[0_20px_58px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_28%)]" />

            <div className="relative flex items-center gap-3 px-4 pb-3 pt-5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[16px] bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow">
                <Zap size={17} />
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="min-w-0"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-brand-cyan/70">
                      Veritus
                    </p>
                    <p className="truncate text-sm font-semibold text-white">
                      Control panel
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="relative mx-4 mb-2 overflow-hidden rounded-[18px] border border-white/10 bg-black/20 p-3.5"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,255,0.14),transparent_32%)]" />
                  <p className="relative text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Capture
                  </p>
                  <p className="relative mt-2 text-xs leading-5 text-slate-400">
                    Add something new without leaving the board.
                  </p>
                  <button
                    onClick={() => setAIChat(true)}
                    className="relative mt-3 flex w-full items-center justify-between rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-2.5 text-sm font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
                  >
                    Open capture
                    <Zap size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <NavLinks
              pathname={pathname}
              showLabels={sidebarOpen}
              indicatorId="desktop-sidebar-indicator"
            />

            <div className="relative mt-auto p-4">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.04] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <button
                  onClick={toggleSidebar}
                  className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {sidebarOpen ? (
                    <ChevronLeft size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -6 }}
                        className="text-sm font-medium"
                      >
                        Collapse
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <AnimatePresence initial={false}>
                  {sidebarOpen && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="px-3 pb-2 pt-1 text-xs leading-5 text-slate-500"
                    >
                      Keep the rail open while planning. Collapse it when you
                      just need a narrow nav.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            <button
              aria-label="Close navigation"
              onClick={() => setMobileSidebar(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-y-0 left-0 flex w-[88vw] max-w-[360px] flex-col rounded-r-[30px] border-r border-white/10 bg-[linear-gradient(180deg,rgba(17,18,32,0.96),rgba(9,10,18,0.94))] shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_34%)]" />
              <div className="relative flex h-20 items-center justify-between gap-3 border-b border-white/10 px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-brand-cyan/70">
                      Veritus
                    </p>
                    <p className="text-sm font-semibold text-white">
                      Personal Life OS
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileSidebar(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-slate-300"
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              <NavLinks
                pathname={pathname}
                showLabels
                onNavigate={() => setMobileSidebar(false)}
                indicatorId="mobile-sidebar-indicator"
              />

              <div className="relative border-t border-white/10 px-5 py-5">
                <button
                  onClick={() => {
                    setMobileSidebar(false);
                    setAIChat(true);
                  }}
                  className="flex w-full items-center justify-between rounded-[18px] border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
                >
                  Open capture
                  <Zap size={16} />
                </button>
                <p className="mt-4 text-xs font-medium text-white">
                  Calm, fast, connected.
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Use the dock for quick moves. Use this panel when you need the
                  full map.
                </p>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
