"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CheckSquare,
  DollarSign,
  Flame,
  Target,
  Monitor,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  ArrowRight,
  Circle,
  CheckCircle2,
  AlertCircle,
  Star,
  Activity,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonDashboard } from "@/components/ui/Skeleton";
import { format, parseISO } from "date-fns";

/* ── Types matching what dashboard page passes ──────────── */
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
}

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(n);
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-slate-400",
};

export function OverviewCards({ summary, loading }: Props) {
  if (loading) return <SkeletonDashboard />;

  const { tasks, money, habits, goals, devices, learningHoursThisWeek } =
    summary;
  const agendaTasks = summary.agendaTasks ?? [];
  const recentTxs = summary.recentTxs ?? [];
  const activeGoals = summary.activeGoals ?? [];
  const todayHabits = summary.todayHabits ?? [];
  const completedIds = summary.completedHabitIds ?? [];

  const habitRate =
    habits.total > 0
      ? Math.round((habits.completedToday / habits.total) * 100)
      : 0;
  const moneyPositive = money.balance >= 0;

  const sections = [
    {
      label: "Tasks",
      href: "/dashboard/tasks",
      icon: <CheckSquare size={16} className="text-brand-cyan" />,
      primary: tasks.pending,
      primaryLabel: "pending",
      secondary: `${tasks.completed} done · ${tasks.inFocus} in focus`,
      alert: tasks.urgent > 0 ? `${tasks.urgent} urgent` : null,
      color: "brand-cyan",
    },
    {
      label: "Money",
      href: "/dashboard/money",
      icon: <DollarSign size={16} className="text-brand-green" />,
      primary: fmt(money.balance, money.currency),
      primaryLabel: "balance this month",
      secondary: `↑${fmt(money.income, money.currency)} · ↓${fmt(money.expense, money.currency)}`,
      alert: null,
      color: moneyPositive ? "brand-green" : "red-400",
      positive: moneyPositive,
    },
    {
      label: "Habits",
      href: "/dashboard/habits",
      icon: <Flame size={16} className="text-orange-400" />,
      primary: `${habits.completedToday}/${habits.total}`,
      primaryLabel: "done today",
      secondary: `${habitRate}% completion rate`,
      alert: habitRate < 50 && habits.total > 0 ? "Below 50%" : null,
      color: "orange-400",
    },
    {
      label: "Goals",
      href: "/dashboard/goals",
      icon: <Target size={16} className="text-brand-purple" />,
      primary: goals.active,
      primaryLabel: "active goals",
      secondary: `${goals.completed} completed`,
      alert: null,
      color: "brand-purple",
    },
    {
      label: "Learning",
      href: "/dashboard/learning",
      icon: <BookOpen size={16} className="text-yellow-400" />,
      primary: `${Math.round(learningHoursThisWeek)}h`,
      primaryLabel: "this week",
      secondary: learningHoursThisWeek >= 5 ? "On track!" : "Keep going",
      alert: null,
      color: "yellow-400",
    },
    {
      label: "Devices",
      href: "/dashboard/devices",
      icon: <Monitor size={16} className="text-slate-400" />,
      primary: devices.online,
      primaryLabel: "online",
      secondary: `${devices.total} registered`,
      alert: devices.total > 5 ? "Many devices" : null,
      color: "slate-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 17
              ? "afternoon"
              : "evening"}{" "}
          👋
        </h1>
        <p className="text-sm text-slate-400">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {sections.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={s.href}
              className="block glass rounded-2xl p-4 glass-hover transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                {s.icon}
                {s.alert && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                    {s.alert}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-xl font-bold tabular-nums",
                  `text-${s.color}`,
                )}
              >
                {s.primary}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {s.primaryLabel}
              </p>
              <p className="text-[10px] text-slate-600 mt-1 truncate">
                {s.secondary}
              </p>
              <div className="flex items-center gap-1 mt-2 text-slate-600 group-hover:text-slate-400 transition-colors">
                <span className="text-[9px]">View</span>
                <ArrowRight size={9} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Main content: Agenda + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Agenda */}
        <div className="lg:col-span-2 space-y-4">
          {/* Task agenda */}
          {agendaTasks.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-brand-cyan" />
                  <p className="text-xs font-semibold text-white">
                    Today's Focus
                  </p>
                </div>
                <Link
                  href="/dashboard/tasks"
                  className="text-[10px] text-slate-500 hover:text-brand-cyan transition-colors flex items-center gap-1"
                >
                  All tasks <ArrowRight size={9} />
                </Link>
              </div>
              <div className="divide-y divide-surface-border">
                {agendaTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    {task.status === "completed" ? (
                      <CheckCircle2
                        size={14}
                        className="text-brand-green flex-shrink-0"
                      />
                    ) : (
                      <Circle
                        size={14}
                        className="text-slate-600 flex-shrink-0"
                      />
                    )}
                    <p
                      className={cn(
                        "text-xs flex-1 truncate",
                        task.status === "completed"
                          ? "line-through text-slate-500"
                          : "text-white",
                      )}
                    >
                      {task.title}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] capitalize flex-shrink-0",
                        PRIORITY_COLOR[task.priority] ?? "text-slate-500",
                      )}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Habits for today */}
          {todayHabits.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={13} className="text-orange-400" />
                  <p className="text-xs font-semibold text-white">
                    Daily Habits
                  </p>
                </div>
                <Link
                  href="/dashboard/habits"
                  className="text-[10px] text-slate-500 hover:text-brand-cyan transition-colors flex items-center gap-1"
                >
                  Manage <ArrowRight size={9} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-px bg-surface-border">
                {todayHabits.slice(0, 6).map((habit) => {
                  const done = completedIds.includes(habit.id);
                  return (
                    <div
                      key={habit.id}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 bg-bg-primary transition-colors",
                        done ? "bg-brand-green/5" : "",
                      )}
                    >
                      {done ? (
                        <CheckCircle2
                          size={13}
                          className="text-brand-green flex-shrink-0"
                        />
                      ) : (
                        <Circle
                          size={13}
                          className="text-slate-600 flex-shrink-0"
                        />
                      )}
                      <p
                        className={cn(
                          "text-xs truncate",
                          done ? "text-slate-500 line-through" : "text-white",
                        )}
                      >
                        {habit.name}
                      </p>
                      {habit.streak > 0 && (
                        <span className="text-[9px] text-orange-400 ml-auto flex-shrink-0">
                          {habit.streak}🔥
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active goals progress */}
          {activeGoals.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={13} className="text-brand-purple" />
                  <p className="text-xs font-semibold text-white">
                    Active Goals
                  </p>
                </div>
                <Link
                  href="/dashboard/goals"
                  className="text-[10px] text-slate-500 hover:text-brand-cyan transition-colors flex items-center gap-1"
                >
                  All goals <ArrowRight size={9} />
                </Link>
              </div>
              <div className="divide-y divide-surface-border">
                {activeGoals.slice(0, 4).map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">
                        {goal.title}
                      </p>
                      {goal.category && (
                        <p className="text-[10px] text-slate-500">
                          {goal.category}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 h-1.5 bg-surface-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-purple rounded-full transition-all"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right">
                        {goal.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Recent Txs + Quick Actions */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="glass rounded-2xl p-4">
            <p className="text-xs font-semibold text-white mb-3 flex items-center gap-2">
              <Zap size={12} className="text-brand-cyan" /> Quick Actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: "Add Task",
                  href: "/tasks",
                  icon: <CheckSquare size={13} />,
                  color: "text-brand-cyan",
                },
                {
                  label: "Log Expense",
                  href: "/money",
                  icon: <DollarSign size={13} />,
                  color: "text-brand-green",
                },
                {
                  label: "Log Study",
                  href: "/learning",
                  icon: <BookOpen size={13} />,
                  color: "text-yellow-400",
                },
                {
                  label: "New Goal",
                  href: "/goals",
                  icon: <Target size={13} />,
                  color: "text-brand-purple",
                },
                {
                  label: "Write Note",
                  href: "/notes",
                  icon: <Brain size={13} />,
                  color: "text-slate-400",
                },
                {
                  label: "Log Habit",
                  href: "/habits",
                  icon: <Flame size={13} />,
                  color: "text-orange-400",
                },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-secondary hover:bg-surface-border transition-colors text-xs text-slate-300 hover:text-white"
                >
                  <span className={a.color}>{a.icon}</span>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Recent transactions */}
          {recentTxs.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-brand-green" />
                  <p className="text-xs font-semibold text-white">
                    Recent Spending
                  </p>
                </div>
                <Link
                  href="/dashboard/money"
                  className="text-[10px] text-slate-500 hover:text-brand-cyan transition-colors flex items-center gap-1"
                >
                  Details <ArrowRight size={9} />
                </Link>
              </div>
              <div className="divide-y divide-surface-border">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">
                        {tx.description}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {tx.category} · {format(parseISO(tx.date), "MMM d")}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-xs font-bold tabular-nums flex-shrink-0",
                        tx.type === "income"
                          ? "text-brand-green"
                          : "text-red-400",
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}${tx.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insight card */}
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Star size={13} className="text-yellow-400" />
              <p className="text-xs font-semibold text-white">Daily Insight</p>
            </div>
            <div className="space-y-2">
              {tasks.pending > 5 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <AlertCircle
                    size={10}
                    className="text-yellow-400 flex-shrink-0"
                  />
                  {tasks.pending} tasks pending — focus on priorities first.
                </p>
              )}
              {habitRate >= 80 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Flame size={10} className="text-orange-400 flex-shrink-0" />
                  Excellent habit streak! You're {habitRate}% done today.
                </p>
              )}
              {money.balance < 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <TrendingDown
                    size={10}
                    className="text-red-400 flex-shrink-0"
                  />
                  Spending exceeds income this month. Review budget.
                </p>
              )}
              {money.balance > 0 && money.expense > 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <TrendingUp
                    size={10}
                    className="text-brand-green flex-shrink-0"
                  />
                  On track! You've saved {fmt(money.balance, money.currency)}{" "}
                  this month.
                </p>
              )}
              {learningHoursThisWeek >= 5 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <BookOpen
                    size={10}
                    className="text-yellow-400 flex-shrink-0"
                  />
                  Great learning week — {Math.round(learningHoursThisWeek)}h so
                  far!
                </p>
              )}
              {goals.active === 0 && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <Target
                    size={10}
                    className="text-brand-purple flex-shrink-0"
                  />
                  Set some goals to give your days direction.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
