"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  ArrowUpCircle,
  ArrowDownCircle,
  Landmark,
  Sparkles,
  Wallet,
  Receipt,
  Loader2,
} from "lucide-react";
import { useMoneyStore } from "@/store/money";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Transaction, SavingsGoal } from "@/types";
import {
  addMonths,
  differenceInCalendarMonths,
  format,
  getDaysInMonth,
  isSameMonth,
  parseISO,
  subMonths,
} from "date-fns";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  initialTransactions?: Transaction[];
  initialSavingsGoals?: SavingsGoal[];
  initialMonth?: string;
  currency?: string;
}

const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Health",
  "Entertainment",
  "Shopping",
  "Education",
  "Utilities",
  "Other",
];
const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Gift",
  "Other",
];
const COLORS = [
  "#00d4ff",
  "#7c3aed",
  "#00ff88",
  "#f59e0b",
  "#f87171",
  "#8b5cf6",
  "#10b981",
  "#3b82f6",
  "#ec4899",
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);
}

export function MoneyTracker({
  initialTransactions = [],
  initialSavingsGoals = [],
  initialMonth,
  currency = "USD",
}: Props) {
  const {
    transactions,
    savingsGoals,
    setTransactions,
    setSavingsGoals,
    addSavingsGoal,
    addTransaction,
    removeTransaction,
    removeSavingsGoal,
    monthFilter,
    setMonthFilter,
    setLoading,
  } = useMoneyStore();

  const [isLoading, setIsLoading] = useState(
    initialTransactions.length === 0 && initialSavingsGoals.length === 0,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showSgModal, setShowSgModal] = useState(false);
  const [showDepModal, setShowDepModal] = useState<SavingsGoal | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const seededInitialRef = useRef(false);
  const skippedInitialRequestRef = useRef(false);

  const formatMoney = useCallback(
    (value: number) => {
      try {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
          maximumFractionDigits: 2,
        }).format(value);
      } catch {
        return fmt(value);
      }
    },
    [currency],
  );

  const load = useCallback(
    async (month: string) => {
      setLoading(true);
      setIsRefreshing(true);
      try {
        const [txRes, sgRes] = await Promise.all([
          fetch(`/api/money?month=${month}`),
          fetch("/api/money/savings-goals"),
        ]);

        const [txJson, sgJson] = await Promise.all([
          txRes.json(),
          sgRes.json(),
        ]);

        if (!txRes.ok) {
          throw new Error(txJson.error ?? "Failed to load transactions");
        }

        if (!sgRes.ok) {
          throw new Error(sgJson.error ?? "Failed to load savings goals");
        }

        setTransactions(Array.isArray(txJson.data) ? txJson.data : []);
        setSavingsGoals(Array.isArray(sgJson.data) ? sgJson.data : []);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load money data",
        );
      } finally {
        setLoading(false);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [setTransactions, setSavingsGoals, setLoading],
  );

  useEffect(() => {
    if (seededInitialRef.current) return;

    if (initialMonth) setMonthFilter(initialMonth);
    if (initialTransactions.length > 0) {
      setTransactions(initialTransactions);
    }
    if (initialSavingsGoals.length > 0) {
      setSavingsGoals(initialSavingsGoals);
    }
    if (initialTransactions.length > 0 || initialSavingsGoals.length > 0) {
      setIsLoading(false);
    }

    seededInitialRef.current = true;
  }, [
    initialMonth,
    initialSavingsGoals,
    initialTransactions,
    setMonthFilter,
    setSavingsGoals,
    setTransactions,
  ]);

  useEffect(() => {
    if (!monthFilter) return;

    const canUseInitialPayload =
      !skippedInitialRequestRef.current &&
      monthFilter === initialMonth &&
      initialTransactions.length > 0;

    if (canUseInitialPayload) {
      skippedInitialRequestRef.current = true;
      return;
    }

    void load(monthFilter);
  }, [initialMonth, initialTransactions.length, load, monthFilter]);

  /* ── Filtering by month ── */
  const currentMonth = monthFilter ? parseISO(monthFilter + "-01") : new Date();
  const filtered = useMemo(
    () =>
      transactions.filter((t) => isSameMonth(parseISO(t.date), currentMonth)),
    [transactions, currentMonth],
  );
  const sortedTransactions = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered],
  );

  const monthIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const monthExpenses = filtered
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const monthBalance = monthIncome - monthExpenses;
  const savingsRate =
    monthIncome > 0
      ? Math.round(((monthIncome - monthExpenses) / monthIncome) * 100)
      : 0;
  const trackedDays = isSameMonth(currentMonth, new Date())
    ? Math.max(new Date().getDate(), 1)
    : getDaysInMonth(currentMonth);
  const averageDailyExpense = monthExpenses / trackedDays;
  const totalSavingsTarget = savingsGoals.reduce(
    (sum, goal) => sum + goal.target_amount,
    0,
  );
  const totalSaved = savingsGoals.reduce(
    (sum, goal) => sum + goal.current_amount,
    0,
  );
  const savingsCoverage =
    totalSavingsTarget > 0 ? (totalSaved / totalSavingsTarget) * 100 : 0;

  /* ── Category breakdown ── */
  const catBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] ?? 0) + t.amount;
      });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);
  const topCategory = catBreakdown[0];
  const pieBreakdown = useMemo(() => {
    if (catBreakdown.length <= 4) return catBreakdown;

    const top = catBreakdown.slice(0, 4);
    const other = catBreakdown
      .slice(4)
      .reduce((sum, item) => sum + item.value, 0);

    return other > 0 ? [...top, { name: "Other", value: other }] : top;
  }, [catBreakdown]);

  /* ── Daily trend for area chart ── */
  const trendData = useMemo(() => {
    const days: Record<string, { income: number; expense: number }> = {};
    filtered.forEach((t) => {
      const d = t.date.substring(0, 10);
      if (!days[d]) days[d] = { income: 0, expense: 0 };
      if (t.type === "income") days[d].income += t.amount;
      else days[d].expense += t.amount;
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [filtered]);

  const guidance = useMemo(() => {
    if (monthIncome === 0 && monthExpenses === 0) {
      return {
        title: "Start with a few entries.",
        body: "Once income and expenses are recorded, this workspace will surface pacing, top categories, and savings pressure.",
      };
    }

    if (monthBalance >= 0) {
      return {
        title: "Cash flow is positive this month.",
        body: topCategory
          ? `You are still carrying most of your spend in ${topCategory.name}. Keep that category disciplined and route the surplus into a savings goal.`
          : "Use the remaining margin to strengthen a savings goal before adding new discretionary spend.",
      };
    }

    return {
      title: "Expenses are ahead of income.",
      body: topCategory
        ? `The fastest correction is reducing ${topCategory.name}, which is currently your largest expense bucket.`
        : "Cut one low-value expense this week and avoid adding new recurring costs until the month turns positive.",
    };
  }, [monthBalance, monthExpenses, monthIncome, topCategory]);

  const insightCards = useMemo(
    () => [
      {
        label: "Savings rate",
        value: `${Math.max(savingsRate, 0)}%`,
        note:
          monthIncome > 0
            ? monthBalance >= 0
              ? "Protected margin"
              : "Currently negative"
            : "No income logged",
        icon: <Sparkles size={14} className="text-brand-cyan" />,
      },
      {
        label: "Average daily spend",
        value: formatMoney(averageDailyExpense),
        note: `${trackedDays} day${trackedDays === 1 ? "" : "s"} tracked`,
        icon: <TrendingDown size={14} className="text-red-400" />,
      },
      {
        label: "Savings coverage",
        value:
          totalSavingsTarget > 0
            ? `${Math.round(savingsCoverage)}%`
            : "No goals",
        note:
          totalSavingsTarget > 0
            ? `${formatMoney(totalSaved)} saved`
            : "Create a goal to track reserves",
        icon: <PiggyBank size={14} className="text-brand-purple" />,
      },
    ],
    [
      averageDailyExpense,
      formatMoney,
      monthBalance,
      monthIncome,
      savingsCoverage,
      savingsRate,
      totalSaved,
      totalSavingsTarget,
      trackedDays,
    ],
  );

  function prevMonth() {
    const m = subMonths(currentMonth, 1);
    setMonthFilter(format(m, "yyyy-MM"));
  }
  function nextMonth() {
    const m = addMonths(currentMonth, 1);
    if (!isSameMonth(m, new Date()) && m > new Date()) return;
    setMonthFilter(format(m, "yyyy-MM"));
  }

  const handleDeleteTransaction = useCallback(
    async (transaction: Transaction) => {
      setDeletingTxId(transaction.id);
      try {
        const res = await fetch(`/api/money/${transaction.id}`, {
          method: "DELETE",
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? "Failed to delete transaction");
        }

        removeTransaction(transaction.id);
        toast.success("Transaction deleted");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to delete transaction",
        );
      } finally {
        setDeletingTxId(null);
      }
    },
    [removeTransaction],
  );

  const handleDeleteGoal = useCallback(
    async (goal: SavingsGoal) => {
      setDeletingGoalId(goal.id);
      try {
        const res = await fetch(`/api/money/savings-goals/${goal.id}`, {
          method: "DELETE",
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? "Failed to delete savings goal");
        }

        removeSavingsGoal(goal.id);
        toast.success("Savings goal removed");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to delete savings goal",
        );
      } finally {
        setDeletingGoalId(null);
      }
    },
    [removeSavingsGoal],
  );

  if (isLoading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-[280px] rounded-[32px]" />
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Skeleton className="h-[320px] rounded-[28px]" />
          <Skeleton className="h-[320px] rounded-[28px]" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <SkeletonList rows={5} />
          <Skeleton className="h-[320px] rounded-[28px]" />
        </div>
      </div>
    );

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,32,0.96),rgba(9,10,18,0.94))] p-5 shadow-[0_28px_72px_rgba(0,0,0,0.34)] backdrop-blur-xl md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_34%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <Badge
              variant="cyan"
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.22em]"
            >
              Money OS
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold text-white sm:text-[30px] sm:leading-[1.15]">
              Financial command for {format(currentMonth, "MMMM")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {guidance.title} {guidance.body}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <div className="flex items-center rounded-full border border-white/8 bg-black/20 px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <button
                  onClick={prevMonth}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-2 px-3 text-sm font-medium text-white">
                  <Landmark size={14} className="text-brand-cyan" />
                  {format(currentMonth, "MMMM yyyy")}
                </div>
                <button
                  onClick={nextMonth}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <Badge
                variant={isRefreshing ? "warning" : "default"}
                className="rounded-full px-3 py-1"
              >
                {isRefreshing ? "Refreshing" : `${filtered.length} entries`}
              </Badge>
              {topCategory && (
                <Badge variant="purple" className="rounded-full px-3 py-1">
                  Top spend: {topCategory.name}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
            <Button
              variant="primary"
              size="lg"
              className="justify-center"
              onClick={() => setShowTxModal(true)}
            >
              <Plus size={15} /> Add transaction
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="justify-center"
              onClick={() => setShowSgModal(true)}
            >
              <PiggyBank size={15} /> New savings goal
            </Button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<ArrowUpCircle size={16} className="text-brand-green" />}
            label="Income"
            value={formatMoney(monthIncome)}
            tone="green"
            note={`${filtered.filter((item) => item.type === "income").length} inflow${filtered.filter((item) => item.type === "income").length === 1 ? "" : "s"}`}
          />
          <MetricCard
            icon={<ArrowDownCircle size={16} className="text-red-400" />}
            label="Expenses"
            value={formatMoney(monthExpenses)}
            tone="red"
            note={`${filtered.filter((item) => item.type === "expense").length} outflow${filtered.filter((item) => item.type === "expense").length === 1 ? "" : "s"}`}
          />
          <MetricCard
            icon={<Wallet size={16} className="text-brand-cyan" />}
            label="Net cash"
            value={formatMoney(monthBalance)}
            tone={monthBalance >= 0 ? "cyan" : "red"}
            note={monthBalance >= 0 ? "Above water" : "Needs correction"}
          />
          <MetricCard
            icon={<Target size={16} className="text-brand-purple" />}
            label="Goals funded"
            value={
              totalSavingsTarget > 0
                ? `${Math.round(savingsCoverage)}%`
                : "No goals"
            }
            tone="purple"
            note={
              totalSavingsTarget > 0
                ? `${formatMoney(totalSaved)} parked`
                : "Create your first savings target"
            }
          />
        </div>

        <div className="relative mt-4 grid gap-3 lg:grid-cols-3">
          {insightCards.map((insight) => (
            <div
              key={insight.label}
              className="rounded-[20px] border border-white/8 bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  {insight.label}
                </p>
                {insight.icon}
              </div>
              <p className="mt-2 text-lg font-semibold text-white">
                {insight.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{insight.note}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <section className={panelClass}>
          <SectionHeader
            icon={<TrendingUp size={15} className="text-brand-cyan" />}
            title="Cash flow curve"
            subtitle="Income versus expenses across the month"
          />
          <div className="p-5 pt-0">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient
                      id="incomeGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#00ff88"
                        stopOpacity={0.24}
                      />
                      <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="expenseGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#f87171"
                        stopOpacity={0.24}
                      />
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(value) => format(parseISO(value), "d")}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(value) =>
                      formatMoney(value).replace(/\.00$/, "")
                    }
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f1220",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      fontSize: 12,
                    }}
                    labelFormatter={(label) =>
                      format(parseISO(String(label)), "MMM d")
                    }
                    formatter={(value: number, name: string) => [
                      formatMoney(value),
                      name === "income" ? "Income" : "Expenses",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#00ff88"
                    fill="url(#incomeGradient)"
                    strokeWidth={2.2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f87171"
                    fill="url(#expenseGradient)"
                    strokeWidth={2.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyPanel
                icon={<TrendingUp size={18} className="text-brand-cyan/70" />}
                title="No cash-flow data yet"
                copy="Add a few income or expense entries for this month to unlock the flow curve."
              />
            )}
          </div>
        </section>

        <section className={panelClass}>
          <SectionHeader
            icon={<Sparkles size={15} className="text-brand-purple" />}
            title="Spending mix"
            subtitle="Where the money is actually going"
          />
          <div className="p-5 pt-0">
            {pieBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieBreakdown}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={84}
                      paddingAngle={3}
                    >
                      {pieBreakdown.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0f1220",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 14,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => formatMoney(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {pieBreakdown.map((item, index) => {
                    const percentage =
                      monthExpenses > 0
                        ? (item.value / monthExpenses) * 100
                        : 0;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 rounded-[16px] border border-white/6 bg-white/[0.03] px-3 py-2.5"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: COLORS[index % COLORS.length] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {percentage.toFixed(0)}% of expenses
                          </p>
                        </div>
                        <p className="text-sm font-medium tabular-nums text-slate-200">
                          {formatMoney(item.value)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyPanel
                icon={<TrendingDown size={18} className="text-red-400/70" />}
                title="No expense mix yet"
                copy="Once expenses are logged, category weight and dominant spend will appear here."
              />
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className={cn(panelClass, "overflow-hidden")}>
          <SectionHeader
            icon={<Receipt size={15} className="text-brand-cyan" />}
            title="Recent activity"
            subtitle={`Booked movements for ${format(currentMonth, "MMMM yyyy")}`}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTxModal(true)}
              >
                <Plus size={13} /> Add
              </Button>
            }
          />

          {sortedTransactions.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyPanel
                icon={<Receipt size={18} className="text-slate-500" />}
                title="No transactions this month"
                copy="Record an income or expense and the ledger will start building here."
              />
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {sortedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start gap-3 px-5 py-4"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] border",
                      transaction.type === "income"
                        ? "border-brand-green/20 bg-brand-green/10"
                        : "border-red-400/20 bg-red-400/10",
                    )}
                  >
                    {transaction.type === "income" ? (
                      <ArrowUpCircle size={16} className="text-brand-green" />
                    ) : (
                      <ArrowDownCircle size={16} className="text-red-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {transaction.description || transaction.category}
                      </p>
                      <Badge
                        variant={
                          transaction.type === "income" ? "green" : "red"
                        }
                        size="sm"
                        className="rounded-full px-2 py-0.5"
                      >
                        {transaction.type}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{transaction.category}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-700" />
                      <span>
                        {format(parseISO(transaction.date), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        transaction.type === "income"
                          ? "text-brand-green"
                          : "text-red-400",
                      )}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatMoney(transaction.amount)}
                    </p>
                    <button
                      onClick={() => void handleDeleteTransaction(transaction)}
                      disabled={deletingTxId === transaction.id}
                      className="rounded-lg p-2 text-slate-600 transition-all hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                      aria-label={`Delete ${transaction.description ?? transaction.category}`}
                    >
                      {deletingTxId === transaction.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={panelClass}>
          <SectionHeader
            icon={<PiggyBank size={15} className="text-brand-purple" />}
            title="Savings goals"
            subtitle={
              savingsGoals.length > 0
                ? `${formatMoney(totalSaved)} saved across ${savingsGoals.length} goal${savingsGoals.length === 1 ? "" : "s"}`
                : "Create targets so spare cash has a destination"
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSgModal(true)}
              >
                <Plus size={13} /> New goal
              </Button>
            }
          />

          <div className="space-y-3 p-5 pt-0">
            {savingsGoals.length === 0 ? (
              <EmptyPanel
                icon={<PiggyBank size={18} className="text-brand-purple/70" />}
                title="No savings goals yet"
                copy="Start with one concrete target like an emergency fund, trip, or device replacement buffer."
              />
            ) : (
              savingsGoals.map((goal) => {
                const completion =
                  goal.target_amount > 0
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          (goal.current_amount / goal.target_amount) * 100,
                        ),
                      )
                    : 0;
                const remaining = Math.max(
                  0,
                  goal.target_amount - goal.current_amount,
                );
                const monthsRemaining = goal.deadline
                  ? Math.max(
                      0,
                      differenceInCalendarMonths(
                        parseISO(goal.deadline),
                        currentMonth,
                      ) + 1,
                    )
                  : null;
                const monthlyNeeded =
                  monthsRemaining && remaining > 0
                    ? remaining / monthsRemaining
                    : null;

                return (
                  <div
                    key={goal.id}
                    className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {goal.name}
                          </p>
                          <Badge
                            variant={
                              completion >= 100
                                ? "green"
                                : completion >= 50
                                  ? "cyan"
                                  : "purple"
                            }
                            size="sm"
                            className="rounded-full px-2 py-0.5"
                          >
                            {Math.round(completion)}%
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {goal.deadline
                            ? `Due ${format(parseISO(goal.deadline), "MMM yyyy")}`
                            : "No deadline set"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowDepModal(goal)}
                        >
                          <Plus size={12} /> Deposit
                        </Button>
                        <button
                          onClick={() => void handleDeleteGoal(goal)}
                          disabled={deletingGoalId === goal.id}
                          className="rounded-lg p-2 text-slate-600 transition-all hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                          aria-label={`Delete ${goal.name}`}
                        >
                          {deletingGoalId === goal.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold text-brand-cyan">
                        {formatMoney(goal.current_amount)}
                      </span>
                      <span className="text-slate-500">
                        Target {formatMoney(goal.target_amount)}
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-brand-purple"
                        initial={{ width: 0 }}
                        animate={{ width: `${completion}%` }}
                        transition={{ duration: 0.7 }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>{formatMoney(remaining)} remaining</span>
                      <span>
                        {monthlyNeeded
                          ? `${formatMoney(monthlyNeeded)} / month needed`
                          : completion >= 100
                            ? "Goal fully funded"
                            : "Add a deadline for pacing"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <AddTransactionModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        onCreated={(tx) => {
          addTransaction(tx);
        }}
        currency={currency}
      />
      <AddSavingsGoalModal
        open={showSgModal}
        onClose={() => setShowSgModal(false)}
        onCreated={(sg) => {
          addSavingsGoal(sg);
        }}
        currency={currency}
      />
      {showDepModal && (
        <DepositModal
          goal={showDepModal}
          onClose={() => setShowDepModal(null)}
          onSuccess={() => load(monthFilter)}
          currency={currency}
        />
      )}
    </div>
  );
}

const panelClass =
  "relative overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,32,0.94),rgba(9,10,18,0.92))] shadow-[0_22px_58px_rgba(0,0,0,0.28)] backdrop-blur-xl";

function MetricCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "green" | "red" | "cyan" | "purple";
}) {
  const tones = {
    green: "text-brand-green",
    red: "text-red-400",
    cyan: "text-brand-cyan",
    purple: "text-brand-purple",
  };

  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
      </div>
      <p className={cn("text-xl font-semibold tabular-nums", tones[tone])}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-5">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-sm font-semibold text-white">{title}</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/8 bg-white/[0.02] px-6 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.03]">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{copy}</p>
    </div>
  );
}

function AddTransactionModal({
  open,
  onClose,
  onCreated,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (t: Transaction) => void | Promise<void>;
  currency: string;
}) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("Other");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  const cats = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function submit() {
    if (!amount || !desc) {
      toast.error("Fill all fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: parseFloat(amount),
          description: desc,
          category,
          date,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onCreated(json.data);
      onClose();
      setAmount("");
      setDesc("");
      setCategory("Other");
      toast.success("Transaction added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Transaction">
      <div className="space-y-4">
        <div className="flex rounded-xl overflow-hidden border border-surface-border">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCategory("Other");
              }}
              className={cn(
                "flex-1 py-2 text-sm capitalize transition-colors",
                type === t
                  ? t === "income"
                    ? "bg-brand-green/10 text-brand-green"
                    : "bg-red-400/10 text-red-400"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <Input
          label={`Amount (${currency})`}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <Input
          label="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="e.g. Grocery shopping"
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={saving}>
            Save transaction
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function AddSavingsGoalModal({
  open,
  onClose,
  onCreated,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (sg: SavingsGoal) => void | Promise<void>;
  currency: string;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [dl, setDl] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name || !target) {
      toast.error("Name and target required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/money/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          target_amount: parseFloat(target),
          deadline: dl || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onCreated(json.data);
      onClose();
      setName("");
      setTarget("");
      setDl("");
      toast.success("Savings goal created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Savings Goal">
      <div className="space-y-4">
        <Input
          label="Goal Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Emergency Fund"
        />
        <Input
          label={`Target Amount (${currency})`}
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="5000"
        />
        <Input
          label="Deadline"
          type="month"
          value={dl}
          onChange={(e) => setDl(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={saving}>
            Create goal
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DepositModal({
  goal,
  onClose,
  onSuccess,
  currency,
}: {
  goal: SavingsGoal;
  onClose: () => void;
  onSuccess: () => void;
  currency: string;
}) {
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!amount) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/money/savings-goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_amount: goal.current_amount + parseFloat(amount),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      onSuccess();
      onClose();
      toast.success(`Deposited $${amount}`);
    } catch {
      toast.error("Failed to deposit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Deposit to "${goal.name}"`}>
      <div className="space-y-4">
        <Input
          label={`Deposit Amount (${currency})`}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={saving}>
            Deposit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
