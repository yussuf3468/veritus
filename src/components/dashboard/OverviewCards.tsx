"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  Flame,
  Monitor,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { cn, formatCurrency } from "@/lib/utils";

interface AgendaTask {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
  status: string;
}

interface RecentTx {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
}

interface ActiveGoal {
  id: string;
  title: string;
  progress: number;
  category: string | null;
}

interface TodayHabit {
  id: string;
  name: string;
  streak: number;
}

interface DashboardSummary {
  tasks: {
    total: number;
    pending: number;
    completed: number;
    inFocus: number;
    urgent: number;
  };
  money: { income: number; expense: number; balance: number; currency: string };
  habits: { total: number; completedToday: number };
  goals: { active: number; completed: number; avgProgress: number };
  devices: { total: number; online: number };
  learningHoursThisWeek: number;
  agendaTasks?: AgendaTask[];
  recentTxs?: RecentTx[];
  activeGoals?: ActiveGoal[];
  todayHabits?: TodayHabit[];
  completedHabitIds?: string[];
}

interface Props {
  summary: DashboardSummary;
  loading?: boolean;
  snapshotDateLabel?: string;
  dayPeriod?: string;
}

type StatusTone = "cyan" | "amber" | "rose" | "emerald";

function fmt(value: number, currency = "KES") {
  return formatCurrency(value, currency);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function percentage(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getOperatingStatus(summary: DashboardSummary, habitRate: number) {
  if (summary.tasks.urgent > 0) {
    return {
      tone: "amber" as StatusTone,
      label: `${summary.tasks.urgent} urgent ${summary.tasks.urgent === 1 ? "task" : "tasks"}`,
      description:
        "Urgent work is already visible. Clear the closest deadline first, then protect the rest of the day from spillover.",
    };
  }

  if (summary.money.balance < 0) {
    return {
      tone: "rose" as StatusTone,
      label: "Spending ahead of income",
      description:
        "Cashflow needs a quick correction. Review recent spend before you add more commitments to the week.",
    };
  }

  if (summary.habits.total > 0 && habitRate < 50) {
    return {
      tone: "amber" as StatusTone,
      label: "Routine needs attention",
      description:
        "Your system is healthy enough to recover quickly. Finish a small habit block and use that momentum to reopen focus.",
    };
  }

  if (
    summary.tasks.pending === 0 &&
    summary.habits.total > 0 &&
    habitRate === 100
  ) {
    return {
      tone: "emerald" as StatusTone,
      label: "Clean board",
      description:
        "The queue is under control and your daily rhythm is intact. Use the spare space to move one goal forward.",
    };
  }

  return {
    tone: "cyan" as StatusTone,
    label: "System steady",
    description:
      "Your operating system is balanced enough to push a focused work block without losing awareness of the rest of the board.",
  };
}

function getMomentumLabel(score: number) {
  if (score >= 80) return "Locked in";
  if (score >= 60) return "Steady";
  if (score >= 40) return "Recovering";
  return "Reset mode";
}

const STATUS_STYLES: Record<StatusTone, string> = {
  cyan: "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
  amber: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  rose: "border-red-400/20 bg-red-400/10 text-red-300",
  emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "border-red-400/20 bg-red-400/10 text-red-300",
  high: "border-orange-400/20 bg-orange-400/10 text-orange-300",
  medium: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
  low: "border-white/10 bg-white/[0.05] text-slate-400",
};

export function OverviewCards({
  summary,
  loading,
  snapshotDateLabel,
  dayPeriod = "day",
}: Props) {
  if (loading) return <SkeletonDashboard />;

  const { tasks, money, habits, goals, devices, learningHoursThisWeek } =
    summary;
  const agendaTasks = summary.agendaTasks ?? [];
  const recentTxs = summary.recentTxs ?? [];
  const activeGoals = summary.activeGoals ?? [];
  const todayHabits = summary.todayHabits ?? [];
  const completedIds = summary.completedHabitIds ?? [];

  const habitRate = percentage(habits.completedToday, habits.total);
  const taskCompletionRate = percentage(tasks.completed, tasks.total);
  const goalProgress =
    goals.active > 0 ? goals.avgProgress : goals.completed > 0 ? 72 : 38;
  const moneyHealth =
    money.income > 0
      ? clamp(Math.round((money.balance / money.income) * 100 + 50), 0, 100)
      : money.balance >= 0
        ? 72
        : 28;
  const momentumScore = clamp(
    Math.round(
      taskCompletionRate * 0.32 +
        habitRate * 0.28 +
        goalProgress * 0.2 +
        moneyHealth * 0.2,
    ),
    18,
    97,
  );
  const remainingHabits = Math.max(habits.total - habits.completedToday, 0);
  const operatingStatus = getOperatingStatus(summary, habitRate);
  const primaryAction =
    tasks.pending > 0
      ? { href: "/dashboard/tasks", label: "Open focus queue" }
      : money.expense > 0
        ? { href: "/dashboard/money", label: "Review cashflow" }
        : { href: "/dashboard/goals", label: "Review active goals" };

  const heroSignals = [
    {
      label: "Focus",
      value: String(tasks.inFocus),
      detail: tasks.pending > 0 ? `${tasks.pending} open` : "Queue clear",
      icon: <CheckSquare size={15} className="text-brand-cyan" />,
    },
    {
      label: "Learning",
      value: `${Math.round(learningHoursThisWeek)}h`,
      detail: learningHoursThisWeek >= 5 ? "On pace" : "Add a block",
      icon: <BookOpen size={15} className="text-yellow-300" />,
    },
    {
      label: "Devices",
      value: devices.total ? `${devices.online}/${devices.total}` : "0",
      detail: devices.total > 0 ? "Online now" : "Not connected",
      icon: <Monitor size={15} className="text-slate-300" />,
    },
  ];

  const smartMoves = [
    tasks.urgent > 0
      ? {
          title: "Clear urgent work",
          detail: `${tasks.urgent} urgent ${tasks.urgent === 1 ? "item needs" : "items need"} a first pass today.`,
          href: "/dashboard/tasks",
          tone: "border-yellow-400/20 bg-yellow-400/10 text-yellow-300",
          icon: <AlertCircle size={14} />,
        }
      : {
          title: "Work the next block",
          detail:
            tasks.pending > 0
              ? `${tasks.pending} open ${tasks.pending === 1 ? "task is" : "tasks are"} waiting. Close one cleanly.`
              : "Your task queue is light. Use the space for deeper work.",
          href: "/dashboard/tasks",
          tone: "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
          icon: <CheckSquare size={14} />,
        },
    money.balance < 0
      ? {
          title: "Review spending",
          detail: `You are down ${fmt(Math.abs(money.balance), money.currency)} this month. Check the latest transactions.`,
          href: "/dashboard/money",
          tone: "border-red-400/20 bg-red-400/10 text-red-300",
          icon: <TrendingDown size={14} />,
        }
      : {
          title: "Protect the surplus",
          detail:
            money.expense > 0
              ? `${fmt(money.balance, money.currency)} remains this month. Keep the spread intact.`
              : "No spend is logged yet. Capture the next transaction when it happens.",
          href: "/dashboard/money",
          tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
          icon: <TrendingUp size={14} />,
        },
    habits.total > 0
      ? {
          title: remainingHabits > 0 ? "Finish the routine" : "Habits are done",
          detail:
            remainingHabits > 0
              ? `${remainingHabits} ${remainingHabits === 1 ? "habit is" : "habits are"} left today.`
              : "Daily habits are complete. Roll that consistency into a goal or task push.",
          href: "/dashboard/habits",
          tone: "border-orange-400/20 bg-orange-400/10 text-orange-300",
          icon: <Flame size={14} />,
        }
      : {
          title: "Create one daily habit",
          detail:
            "One repeatable habit gives the rest of the system something stable.",
          href: "/dashboard/habits",
          tone: "border-orange-400/20 bg-orange-400/10 text-orange-300",
          icon: <Flame size={14} />,
        },
  ];

  const topCards = [
    {
      title: "Tasks",
      href: "/dashboard/tasks",
      icon: <CheckSquare size={18} className="text-brand-cyan" />,
      value: String(tasks.pending),
      caption: "open now",
      detail:
        tasks.urgent > 0
          ? `${tasks.urgent} urgent · ${tasks.inFocus} in focus`
          : `${tasks.completed} completed · ${tasks.inFocus} in focus`,
      badge: tasks.urgent > 0 ? `${tasks.urgent} urgent` : null,
      iconWrap: "bg-brand-cyan/10",
    },
    {
      title: "Money",
      href: "/dashboard/money",
      icon: (
        <Wallet
          size={18}
          className={money.balance >= 0 ? "text-emerald-300" : "text-red-300"}
        />
      ),
      value: fmt(money.balance, money.currency),
      caption: "month balance",
      detail: `In ${fmt(money.income, money.currency)} · Out ${fmt(money.expense, money.currency)}`,
      badge: money.balance < 0 ? "Needs review" : null,
      iconWrap: money.balance >= 0 ? "bg-emerald-400/10" : "bg-red-400/10",
    },
    {
      title: "Habits",
      href: "/dashboard/habits",
      icon: <Flame size={18} className="text-orange-300" />,
      value: `${habits.completedToday}/${habits.total}`,
      caption: "done today",
      detail:
        habits.total > 0
          ? `${habitRate}% completion rate`
          : "Create a daily baseline",
      badge: habits.total > 0 && habitRate < 50 ? "Below 50%" : null,
      iconWrap: "bg-orange-400/10",
    },
    {
      title: "Goals",
      href: "/dashboard/goals",
      icon: <Target size={18} className="text-fuchsia-300" />,
      value: String(goals.active),
      caption: "active targets",
      detail:
        goals.active > 0
          ? `${goals.avgProgress}% average progress`
          : `${goals.completed} completed so far`,
      badge: goals.active === 0 ? "Add one" : null,
      iconWrap: "bg-fuchsia-400/10",
    },
  ];

  const momentumBars = [
    {
      label: "Task completion",
      value: taskCompletionRate,
      barClass: "bg-gradient-to-r from-brand-cyan to-sky-300",
    },
    {
      label: "Habit cadence",
      value: habitRate,
      barClass: "bg-gradient-to-r from-orange-400 to-yellow-300",
    },
    {
      label: "Cash health",
      value: moneyHealth,
      barClass: "bg-gradient-to-r from-emerald-400 to-lime-300",
    },
    {
      label: "Goal progress",
      value: goalProgress,
      barClass: "bg-gradient-to-r from-brand-purple to-fuchsia-300",
    },
  ];

  const insightLines = [
    tasks.pending > 0
      ? {
          icon: <CheckSquare size={12} className="text-brand-cyan" />,
          text: `${tasks.pending} ${tasks.pending === 1 ? "task is" : "tasks are"} open. ${tasks.urgent > 0 ? "Start with the urgent queue." : "Finish one cleanly before starting another."}`,
        }
      : {
          icon: <CheckCircle2 size={12} className="text-emerald-300" />,
          text: "Your task board is light. Use the breathing room for recovery or strategic work.",
        },
    money.balance < 0
      ? {
          icon: <TrendingDown size={12} className="text-red-300" />,
          text: `You are down ${fmt(Math.abs(money.balance), money.currency)} this month. Trim the next non-essential expense.`,
        }
      : {
          icon: <TrendingUp size={12} className="text-emerald-300" />,
          text:
            money.expense > 0
              ? `You are holding ${fmt(money.balance, money.currency)} in surplus this month.`
              : "No recent money movement has been logged. Capture the next one immediately.",
        },
    habits.total > 0
      ? {
          icon: <Flame size={12} className="text-orange-300" />,
          text:
            remainingHabits > 0
              ? `${remainingHabits} ${remainingHabits === 1 ? "habit remains" : "habits remain"} today. A short reset block will close them.`
              : "Daily habits are complete. Momentum is available for deeper work.",
        }
      : {
          icon: <Target size={12} className="text-fuchsia-300" />,
          text: "You do not have a habit baseline yet. One daily anchor will make the rest of the system easier to trust.",
        },
    learningHoursThisWeek >= 5
      ? {
          icon: <BookOpen size={12} className="text-yellow-300" />,
          text: `Learning is on track at ${Math.round(learningHoursThisWeek)} hours this week.`,
        }
      : {
          icon: <Brain size={12} className="text-slate-300" />,
          text: "Schedule one deliberate study block so learning does not get pushed off the board.",
        },
  ];

  return (
    <div className="space-y-4 lg:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_360px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(9,10,18,0.9))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-5"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.14),transparent_22%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_40%)]" />

          <div className="relative flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full border px-3 py-1",
                  STATUS_STYLES[operatingStatus.tone],
                )}
              >
                {operatingStatus.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-400">
                {snapshotDateLabel ?? "Today"}
              </span>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-400">
              Good {dayPeriod}
            </div>
          </div>

          <div className="relative mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_300px] lg:items-start">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Overview
              </p>
              <h2 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Keep the day clear and the board readable.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {operatingStatus.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2.5">
                <Link
                  href="/dashboard/ai"
                  className="flex items-center gap-2 rounded-xl border border-brand-cyan/20 bg-brand-cyan/10 px-3.5 py-2.5 text-sm font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
                >
                  <Bot size={16} />
                  Capture with AI
                </Link>

                <Link
                  href={primaryAction.href}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
                >
                  {primaryAction.label}
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {heroSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-[18px] border border-white/10 bg-black/20 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {signal.icon}
                      <p className="text-sm font-semibold text-white">
                        {signal.value}
                      </p>
                    </div>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                      {signal.label}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-slate-400">
                      {signal.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    Operator score
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
                    {momentumScore}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-slate-300">
                  {getMomentumLabel(momentumScore)}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {momentumBars.map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-400">{bar.label}</span>
                      <span className="font-medium text-white">
                        {bar.value}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn("h-full rounded-full", bar.barClass)}
                        style={{ width: `${bar.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                  Snapshot
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {tasks.pending > 0
                    ? `${tasks.pending} tasks remain active, ${remainingHabits} habits are still open, and your balance is ${fmt(money.balance, money.currency)}.`
                    : `The active queue is light, habits are ${habitRate}% complete, and your balance is ${fmt(money.balance, money.currency)}.`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,17,28,0.92),rgba(9,10,18,0.9))] p-4 shadow-[0_22px_72px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-5"
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
            Next moves
          </p>

          <div className="mt-4 space-y-2.5">
            {smartMoves.map((move) => (
              <Link
                key={move.title}
                href={move.href}
                className="group block rounded-[18px] border border-white/10 bg-white/[0.03] p-3.5 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 rounded-xl border px-2.5 py-2",
                      move.tone,
                    )}
                  >
                    {move.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">
                        {move.title}
                      </p>
                      <ArrowRight
                        size={14}
                        className="text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                      />
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-400">
                      {move.detail}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-black/20 p-3.5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Secondary signals
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center gap-2 text-yellow-300">
                  <BookOpen size={15} />
                  <span className="text-xs font-medium text-white">
                    Learning pace
                  </span>
                </div>
                <p className="mt-2.5 text-xl font-semibold text-white">
                  {Math.round(learningHoursThisWeek)}h
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  {learningHoursThisWeek >= 5
                    ? "You are maintaining a strong weekly study rhythm."
                    : "One more study block would tighten the week."}
                </p>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center gap-2 text-slate-300">
                  <Monitor size={15} />
                  <span className="text-xs font-medium text-white">
                    Connected devices
                  </span>
                </div>
                <p className="mt-2.5 text-xl font-semibold text-white">
                  {devices.total > 0
                    ? `${devices.online}/${devices.total}`
                    : "0"}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  {devices.total > 0
                    ? `${devices.online} currently online across your registered gear.`
                    : "No devices are registered yet."}
                </p>
              </div>

              <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3.5">
                <div className="flex items-center gap-2 text-fuchsia-300">
                  <Target size={15} />
                  <span className="text-xs font-medium text-white">
                    Goal depth
                  </span>
                </div>
                <p className="mt-2.5 text-xl font-semibold text-white">
                  {goals.active > 0
                    ? `${goals.avgProgress}%`
                    : String(goals.completed)}
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-400">
                  {goals.active > 0
                    ? `${goals.active} active goals are averaging ${goals.avgProgress}% progress.`
                    : `${goals.completed} completed goals are on record.`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {topCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + index * 0.04 }}
          >
            <Link
              href={card.href}
              className="group block rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,18,30,0.88),rgba(11,12,22,0.84))] p-4 shadow-[0_18px_56px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cn("rounded-[16px] p-2.5", card.iconWrap)}>
                  {card.icon}
                </div>
                {card.badge && (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-slate-300">
                    {card.badge}
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm font-medium text-slate-400">
                {card.title}
              </p>
              <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                {card.caption}
              </p>
              <p className="mt-2.5 text-sm leading-6 text-slate-400">
                {card.detail}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors group-hover:text-white">
                Open {card.title.toLowerCase()}
                <ArrowRight size={14} />
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.9),rgba(10,11,20,0.88))] shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-white">
                  <Clock size={15} className="text-brand-cyan" />
                  <p className="text-sm font-semibold">Today's runway</p>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Work the visible queue without losing the rest of the board.
                </p>
              </div>
              <Link
                href="/dashboard/tasks"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                All tasks
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-white/10">
              {agendaTasks.length > 0 ? (
                agendaTasks.slice(0, 6).map((task) => {
                  const taskDone = task.status === "completed";
                  return (
                    <div
                      key={task.id}
                      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        {taskDone ? (
                          <CheckCircle2
                            size={16}
                            className="mt-0.5 flex-shrink-0 text-emerald-300"
                          />
                        ) : (
                          <Circle
                            size={16}
                            className="mt-0.5 flex-shrink-0 text-slate-600"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              taskDone
                                ? "text-slate-500 line-through"
                                : "text-white",
                            )}
                          >
                            {task.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {task.due_date && (
                              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
                                Due {format(parseISO(task.due_date), "MMM d")}
                              </span>
                            )}
                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 capitalize",
                                PRIORITY_STYLES[task.priority] ??
                                  PRIORITY_STYLES.low,
                              )}
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
                        {taskDone ? "Closed" : "In queue"}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-9 text-center sm:px-6">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-brand-cyan">
                    <CheckSquare size={18} />
                  </div>
                  <p className="mt-4 text-base font-medium text-white">
                    Your runway is clear.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Add a task or ask AI to capture what needs doing next.
                  </p>
                  <Link
                    href="/dashboard/ai"
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-brand-cyan/20 bg-brand-cyan/10 px-4 py-3 text-sm font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
                  >
                    Open AI capture
                    <Bot size={15} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.9),rgba(10,11,20,0.88))] shadow-[0_20px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
                <div className="flex items-center gap-2 text-white">
                  <Flame size={15} className="text-orange-300" />
                  <p className="text-sm font-semibold">Habit cadence</p>
                </div>
                <Link
                  href="/dashboard/habits"
                  className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
                >
                  Open habits
                </Link>
              </div>

              <div className="space-y-3 px-4 py-4">
                {todayHabits.length > 0 ? (
                  todayHabits.slice(0, 5).map((habit) => {
                    const done = completedIds.includes(habit.id);
                    return (
                      <div
                        key={habit.id}
                        className={cn(
                          "flex items-center gap-3 rounded-[18px] border px-3.5 py-3",
                          done
                            ? "border-emerald-400/15 bg-emerald-400/5"
                            : "border-white/10 bg-white/[0.03]",
                        )}
                      >
                        {done ? (
                          <CheckCircle2
                            size={15}
                            className="text-emerald-300"
                          />
                        ) : (
                          <Circle size={15} className="text-slate-600" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              done
                                ? "text-slate-500 line-through"
                                : "text-white",
                            )}
                          >
                            {habit.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {habit.streak > 0
                              ? `${habit.streak} day streak`
                              : "Build the first streak"}
                          </p>
                        </div>
                        <span className="text-xs text-orange-300">
                          {habit.streak > 0 ? `${habit.streak}x` : "New"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-white">
                      No daily habits yet.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      One repeatable habit is enough to stabilize the rest of
                      the week.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.9),rgba(10,11,20,0.88))] shadow-[0_20px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
                <div className="flex items-center gap-2 text-white">
                  <Target size={15} className="text-fuchsia-300" />
                  <p className="text-sm font-semibold">Active goals</p>
                </div>
                <Link
                  href="/dashboard/goals"
                  className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
                >
                  Open goals
                </Link>
              </div>

              <div className="space-y-3 px-4 py-4">
                {activeGoals.length > 0 ? (
                  activeGoals.slice(0, 4).map((goal) => (
                    <div
                      key={goal.id}
                      className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {goal.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {goal.category ?? "General"}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-fuchsia-300">
                          {goal.progress}%
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-fuchsia-300"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-white">
                      No active goals are running.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Add one target so your daily activity has a visible
                      direction.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.9),rgba(10,11,20,0.88))] shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
              <div className="flex items-center gap-2 text-white">
                <Activity size={15} className="text-emerald-300" />
                <p className="text-sm font-semibold">Recent money activity</p>
              </div>
              <Link
                href="/dashboard/money"
                className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
              >
                View all
              </Link>
            </div>

            <div className="space-y-3 px-4 py-4">
              {recentTxs.length > 0 ? (
                recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-3.5 py-3"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl",
                        tx.type === "income"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-red-400/10 text-red-300",
                      )}
                    >
                      {tx.type === "income" ? (
                        <TrendingUp size={15} />
                      ) : (
                        <TrendingDown size={15} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {tx.description ||
                          tx.category ||
                          "Untitled transaction"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tx.category || "Other"} ·{" "}
                        {format(parseISO(tx.date), "MMM d")}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        tx.type === "income"
                          ? "text-emerald-300"
                          : "text-red-300",
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {fmt(Number(tx.amount), money.currency)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                  <p className="text-sm font-medium text-white">
                    No transactions yet.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    The next income or expense you capture will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,30,0.9),rgba(10,11,20,0.88))] p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex items-center gap-2 text-white">
              <Star size={15} className="text-yellow-300" />
              <p className="text-sm font-semibold">Daily brief</p>
            </div>

            <div className="mt-4 space-y-3">
              {insightLines.map((insight, index) => (
                <div
                  key={`${insight.text}-${index}`}
                  className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-3.5 py-3"
                >
                  <span className="mt-0.5">{insight.icon}</span>
                  <p className="text-sm leading-6 text-slate-300">
                    {insight.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <Link
                href="/dashboard/ai"
                className="flex items-center justify-between rounded-[18px] border border-brand-cyan/20 bg-brand-cyan/10 px-3.5 py-3 text-left text-sm font-medium text-brand-cyan transition-colors hover:bg-brand-cyan/15"
              >
                <span className="flex items-center gap-2">
                  <Bot size={15} />
                  Capture with AI
                </span>
                <ArrowRight size={14} />
              </Link>

              {[
                {
                  href: "/dashboard/tasks",
                  label: "Open tasks",
                  icon: <CheckSquare size={15} className="text-brand-cyan" />,
                },
                {
                  href: "/dashboard/money",
                  label: "Open money",
                  icon: <Wallet size={15} className="text-emerald-300" />,
                },
                {
                  href: "/dashboard/goals",
                  label: "Review goals",
                  icon: <Target size={15} className="text-fuchsia-300" />,
                },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
                >
                  <span className="flex items-center gap-2">
                    {action.icon}
                    {action.label}
                  </span>
                  <ArrowRight size={14} className="text-slate-500" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
