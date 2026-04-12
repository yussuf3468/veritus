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
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/dashboard/money", icon: DollarSign, label: "Money" },
  { href: "/dashboard/learning", icon: BookOpen, label: "Learning" },
  { href: "/dashboard/notes", icon: FileText, label: "Notes" },
  { href: "/dashboard/habits", icon: Activity, label: "Habits" },
  { href: "/dashboard/goals", icon: Target, label: "Goals" },
  { href: "/dashboard/devices", icon: Monitor, label: "Devices" },
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
    <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-200",
              active
                ? "bg-brand-cyan/12 text-brand-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {active && (
              <motion.div
                layoutId={indicatorId}
                className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand-cyan"
              />
            )}
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {label}
                </motion.span>
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
  } = useUIStore();

  useEffect(() => {
    setMobileSidebar(false);
  }, [pathname, setMobileSidebar]);

  return (
    <>
      <motion.aside
        animate={{ width: sidebarOpen ? 252 : 84 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="relative hidden h-screen flex-shrink-0 border-r border-surface-border bg-bg-secondary/70 backdrop-blur-xl md:flex"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.14),transparent_34%)]" />
        <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-20 items-center gap-3 border-b border-surface-border px-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow">
              <Zap size={18} />
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
                  <p className="text-xs uppercase tracking-[0.32em] text-brand-cyan/70">
                    Veritus
                  </p>
                  <p className="truncate text-sm font-semibold text-white">
                    Personal Life OS
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <NavLinks
            pathname={pathname}
            showLabels={sidebarOpen}
            indicatorId="desktop-sidebar-indicator"
          />

          <div className="border-t border-surface-border p-3">
            <button
              onClick={toggleSidebar}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    className="text-sm font-medium"
                  >
                    Collapse rail
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
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
              className="absolute inset-y-0 left-0 flex w-[86vw] max-w-[340px] flex-col border-r border-surface-border bg-bg-panel/95 shadow-panel backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_34%)]" />
              <div className="relative flex h-20 items-center justify-between gap-3 border-b border-surface-border px-5">
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
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-border bg-white/5 text-slate-300"
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

              <div className="relative border-t border-surface-border px-5 py-4">
                <p className="text-xs font-medium text-white">Calm, fast, connected.</p>
                <p className="mt-1 text-xs text-slate-500">
                  Use the dock for fast actions. Use this panel for the full system.
                </p>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
