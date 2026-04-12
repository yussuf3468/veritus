"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  BarChart2,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import { useMoneyStore } from "@/store/money";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Skeleton,
  SkeletonStats,
  SkeletonList,
} from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Transaction, SavingsGoal } from "@/types";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  isSameMonth,
  parseISO,
} from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
}: Props) {
  const {
    transactions,
    savingsGoals,
    setTransactions,
    setSavingsGoals,
    addSavingsGoal,
    addTransaction,
    removeTransaction,
    balance,
    income,
    expenses,
    monthFilter,
    setMonthFilter,
    setLoading,
  } = useMoneyStore();

  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "transactions" | "savings">(
    "overview",
  );
  const [showTxModal, setShowTxModal] = useState(false);
  const [showSgModal, setShowSgModal] = useState(false);
  const [showDepModal, setShowDepModal] = useState<SavingsGoal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, sgRes] = await Promise.all([
        fetch("/api/money"),
        fetch("/api/money/savings-goals").catch(() => null),
      ]);
      const txJson = await txRes.json();
      if (txJson.data?.transactions) setTransactions(txJson.data.transactions);
      if (txJson.data?.savingsGoals) setSavingsGoals(txJson.data.savingsGoals);
      if (sgRes) {
        const sgJson = await sgRes.json();
        if (sgJson.data) setSavingsGoals(sgJson.data);
      }
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [setTransactions, setSavingsGoals, setLoading]);

  useEffect(() => {
    if (initialTransactions.length > 0) {
      setTransactions(initialTransactions);
      setSavingsGoals(initialSavingsGoals);
      setIsLoading(false);
    } else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Filtering by month ── */
  const currentMonth = monthFilter ? parseISO(monthFilter + "-01") : new Date();
  const filtered = useMemo(
    () =>
      transactions.filter((t) => isSameMonth(parseISO(t.date), currentMonth)),
    [transactions, currentMonth],
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

  function prevMonth() {
    const m = subMonths(currentMonth, 1);
    setMonthFilter(format(m, "yyyy-MM"));
  }
  function nextMonth() {
    const m = addMonths(currentMonth, 1);
    if (!isSameMonth(m, new Date()) && m > new Date()) return;
    setMonthFilter(format(m, "yyyy-MM"));
  }

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <SkeletonStats count={4} />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <Skeleton className="h-52 rounded-2xl" />
        <SkeletonList rows={5} />
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Month nav + summary ── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-surface-border transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-semibold text-white">
            {format(currentMonth, "MMMM yyyy")}
          </p>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-surface-border transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={<ArrowUpCircle size={16} className="text-brand-green" />}
            label="Income"
            value={fmt(monthIncome)}
            color="text-brand-green"
          />
          <StatCard
            icon={<ArrowDownCircle size={16} className="text-red-400" />}
            label="Expenses"
            value={fmt(monthExpenses)}
            color="text-red-400"
          />
          <StatCard
            icon={<DollarSign size={16} className="text-brand-cyan" />}
            label="Balance"
            value={fmt(monthBalance)}
            color={monthBalance >= 0 ? "text-brand-cyan" : "text-red-400"}
          />
          <StatCard
            icon={<TrendingUp size={16} className="text-brand-purple" />}
            label="Savings Rate"
            value={`${Math.max(0, savingsRate)}%`}
            color="text-brand-purple"
          />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl overflow-hidden border border-surface-border">
          {(["overview", "transactions", "savings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 text-xs capitalize transition-colors",
                tab === t
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {tab === "savings" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSgModal(true)}
            >
              <PiggyBank size={13} /> New Goal
            </Button>
          )}
          {tab !== "savings" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowTxModal(true)}
            >
              <Plus size={13} /> Add
            </Button>
          )}
        </div>
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-4">
          {trendData.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <p className="text-xs text-slate-400 mb-4">Daily Cash Flow</p>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    tickFormatter={(d) => d.split("-")[2]}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f1117",
                      border: "1px solid #1e2030",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: number) => fmt(v)}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#00ff88"
                    fill="url(#inc)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#f87171"
                    fill="url(#exp)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown table */}
          {catBreakdown.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
                <BarChart2 size={14} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Expenses by Category
                </p>
              </div>
              <div className="divide-y divide-surface-border">
                {catBreakdown.slice(0, 6).map(({ name, value }, i) => {
                  const pct =
                    monthExpenses > 0 ? (value / monthExpenses) * 100 : 0;
                  return (
                    <div
                      key={name}
                      className="px-5 py-2.5 flex items-center gap-3"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-xs text-white flex-1">{name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-surface-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-12 text-right">
                          {fmt(value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {catBreakdown.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              No expense data for this month
            </div>
          )}
        </div>
      )}

      {/* ── Transactions ── */}
      {tab === "transactions" && (
        <div className="glass rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No transactions this month.
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {[...filtered]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div
                      className={cn(
                        "p-2 rounded-xl",
                        tx.type === "income"
                          ? "bg-brand-green/10"
                          : "bg-red-400/10",
                      )}
                    >
                      {tx.type === "income" ? (
                        <ArrowUpCircle size={14} className="text-brand-green" />
                      ) : (
                        <ArrowDownCircle size={14} className="text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {tx.category} · {format(parseISO(tx.date), "MMM d")}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-bold tabular-nums",
                        tx.type === "income"
                          ? "text-brand-green"
                          : "text-red-400",
                      )}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {fmt(tx.amount)}
                    </p>
                    <button
                      onClick={() => removeTransaction(tx.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── Savings Goals ── */}
      {tab === "savings" && (
        <div className="space-y-3">
          {savingsGoals.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">
              <PiggyBank size={32} className="mx-auto mb-3 opacity-30" />
              No savings goals yet.
            </div>
          )}
          {savingsGoals.map((sg) => {
            const pct = Math.min(
              100,
              (sg.current_amount / sg.target_amount) * 100,
            );
            const remaining = sg.target_amount - sg.current_amount;
            return (
              <div key={sg.id} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {sg.name}
                    </p>
                    {sg.deadline && (
                      <p className="text-xs text-slate-500">
                        Due {format(parseISO(sg.deadline), "MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDepModal(sg)}
                  >
                    <Plus size={12} /> Deposit
                  </Button>
                </div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-brand-cyan font-bold">
                    {fmt(sg.current_amount)}
                  </span>
                  <span className="text-slate-500">
                    {fmt(sg.target_amount)}
                  </span>
                </div>
                <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-brand-cyan rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 mt-1.5">
                  <span>{Math.round(pct)}% saved</span>
                  {remaining > 0 && <span>{fmt(remaining)} to go</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTransactionModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        onCreated={(tx) => {
          addTransaction(tx);
          load();
        }}
      />
      <AddSavingsGoalModal
        open={showSgModal}
        onClose={() => setShowSgModal(false)}
        onCreated={(sg) => {
          addSavingsGoal(sg);
        }}
      />
      {showDepModal && (
        <DepositModal
          goal={showDepModal}
          onClose={() => setShowDepModal(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-surface-secondary rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
      <p className={cn("text-lg font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}

function AddTransactionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (t: Transaction) => void;
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
      onCreated(json.data);
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
    <Modal open={open} onClose={onClose} title="Add Transaction">
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
          label="Amount ($)"
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
            Add
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
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (sg: SavingsGoal) => void;
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
      onCreated(json.data);
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
          label="Target Amount ($)"
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
            Create
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
}: {
  goal: SavingsGoal;
  onClose: () => void;
  onSuccess: () => void;
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
          label="Deposit Amount ($)"
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
