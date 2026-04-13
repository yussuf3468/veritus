"use client";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Bot, LogOut, Menu, User } from "lucide-react";
import toast from "react-hot-toast";
import { useUIStore } from "@/store/ui";

const PAGE_META = [
  {
    match: (pathname: string) => pathname === "/dashboard",
    title: "Dashboard",
    subtitle: "See the signals that deserve attention first.",
  },
  {
    match: (pathname: string) =>
      pathname === "/tasks" || pathname.startsWith("/dashboard/tasks"),
    title: "Tasks",
    subtitle: "Work the queue with clear priorities and less friction.",
  },
  {
    match: (pathname: string) =>
      pathname === "/money" || pathname.startsWith("/dashboard/money"),
    title: "Money",
    subtitle: "Track cash movement with a cleaner monthly read.",
  },
  {
    match: (pathname: string) =>
      pathname === "/learning" || pathname.startsWith("/dashboard/learning"),
    title: "Learning",
    subtitle: "Keep deliberate study sessions visible and consistent.",
  },
  {
    match: (pathname: string) =>
      pathname === "/notes" || pathname.startsWith("/dashboard/notes"),
    title: "Notes",
    subtitle: "Capture thinking before it slips away.",
  },
  {
    match: (pathname: string) =>
      pathname === "/habits" || pathname.startsWith("/dashboard/habits"),
    title: "Habits",
    subtitle: "Turn repeatable actions into visible momentum.",
  },
  {
    match: (pathname: string) =>
      pathname === "/goals" || pathname.startsWith("/dashboard/goals"),
    title: "Goals",
    subtitle: "Measure the long game without losing daily clarity.",
  },
  {
    match: (pathname: string) =>
      pathname === "/devices" || pathname.startsWith("/dashboard/devices"),
    title: "Devices",
    subtitle: "See which endpoints are active and connected.",
  },
];

function getPageMeta(pathname: string) {
  return (
    PAGE_META.find((item) => item.match(pathname)) ?? {
      title: "Veritus",
      subtitle: "Run your personal operating system from one place.",
    }
  );
}

interface HeaderProps {
  userEmail?: string;
  userName?: string;
  dateLabel?: string;
}

export function Header({ userEmail, userName, dateLabel }: HeaderProps) {
  const pathname = usePathname();
  const { toggleAIChat, toggleMobileSidebar } = useUIStore();
  const meta = getPageMeta(pathname);

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
    <header className="sticky top-3 z-30 flex-shrink-0 sm:top-4">
      <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,17,28,0.92),rgba(10,11,20,0.88))] shadow-[0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.1),transparent_24%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_20%)]" />
        <div className="relative flex flex-col gap-3 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <button
              onClick={toggleMobileSidebar}
              className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-100 md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={17} />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em]">
                <span className="rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-2.5 py-1 text-brand-cyan">
                  Live
                </span>
                {dateLabel && (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-400">
                    {dateLabel}
                  </span>
                )}
              </div>

              <div className="mt-1.5 min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {meta.title}
                </h1>
                <p className="mt-1 max-w-lg text-xs leading-5 text-slate-400 sm:text-sm">
                  {meta.subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={toggleAIChat}
              className="flex h-9 items-center gap-2 rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 px-3 text-sm font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
              aria-label="Open AI assistant"
            >
              <Bot size={15} />
              <span>Capture</span>
            </button>

            <button
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-400 transition-colors hover:text-white sm:flex"
              aria-label="Notifications"
            >
              <Bell size={15} />
            </button>

            <div className="flex min-w-0 items-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.05] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow">
                <User size={14} />
              </div>

              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[140px] truncate text-sm font-medium text-white">
                  {userName ?? "Yussuf Muse"}
                </p>
                <p className="max-w-[160px] truncate text-[11px] text-slate-500">
                  {userEmail ?? "Private workspace"}
                </p>
              </div>

              <button
                onClick={signOut}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-300"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
