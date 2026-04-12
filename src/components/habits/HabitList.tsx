"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle,
  Circle,
  Flame,
  Trash2,
  Target,
  BarChart2,
  Award,
} from "lucide-react";
import { useHabitStore } from "@/store/habits";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Skeleton,
  SkeletonStats,
  SkeletonCard,
} from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Habit, HabitCompletion } from "@/types";
import {
  format,
  subDays,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface Props {
  initialHabits?: Habit[];
  initialCompletions?: HabitCompletion[];
}

/* ── helpers ─────────────────────────────────────────────── */
function last30Days() {
  return Array.from({ length: 30 }, (_, i) =>
    format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
  );
}

function completionRate(
  habitId: string,
  completions: HabitCompletion[],
  days: string[],
) {
  const hits = days.filter((d) =>
    completions.some((c) => c.habit_id === habitId && c.completed_date === d),
  ).length;
  return days.length > 0 ? Math.round((hits / days.length) * 100) : 0;
}

/* ── Main ─────────────────────────────────────────────────── */
export function HabitList({
  initialHabits = [],
  initialCompletions = [],
}: Props) {
  const {
    habits,
    completions,
    setHabits,
    setCompletions,
    addHabit,
    removeHabit,
    isCompletedToday,
    todayCount,
    setLoading,
  } = useHabitStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [view, setView] = useState<"cards" | "stats">("cards");

  const days30 = useMemo(() => last30Days(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/habits");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setHabits(json.data.habits);
      setCompletions(json.data.completions);
    } catch {
      toast.error("Failed to load habits");
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [setHabits, setCompletions, setLoading]);

  useEffect(() => {
    if (initialHabits.length > 0) {
      setHabits(initialHabits);
      setCompletions(initialCompletions);
      setIsLoading(false);
    } else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(habit: Habit) {
    const today = format(new Date(), "yyyy-MM-dd");
    const done = isCompletedToday(habit.id);
    // Optimistic
    if (done) {
      setCompletions(
        completions.filter(
          (c) => !(c.habit_id === habit.id && c.completed_date === today),
        ),
      );
    } else {
      setCompletions([
        ...completions,
        {
          id: `opt-${Date.now()}`,
          habit_id: habit.id,
          user_id: "",
          completed_date: today,
          created_at: "",
        },
      ]);
    }
    try {
      const res = await fetch(`/api/habits/${habit.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", date: today }),
      });
      if (!res.ok) load();
      else load(); // refresh streaks from server
    } catch {
      load();
    }
  }

  async function deleteHabit(id: string) {
    removeHabit(id);
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
  }

  /* ── Aggregate stats ── */
  const overallRate = useMemo(() => {
    if (!habits.length) return 0;
    const rates = habits.map((h) => completionRate(h.id, completions, days30));
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }, [habits, completions, days30]);

  const bestStreakHabit = useMemo(
    () =>
      habits.reduce<Habit | null>(
        (best, h) => (!best || h.streak > best.streak ? h : best),
        null,
      ),
    [habits],
  );

  const todayDone = todayCount();
  const todayTotal = habits.filter((h) => h.frequency === "daily").length;

  if (isLoading)
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} className="h-36" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Target size={11} /> Today
          </p>
          <p className="text-2xl font-bold text-white">
            {todayDone}
            <span className="text-slate-500 text-base font-normal">
              /{todayTotal}
            </span>
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <BarChart2 size={11} /> 30-Day Rate
          </p>
          <p
            className="text-2xl font-bold"
            style={{
              color:
                overallRate >= 70
                  ? "#00ff88"
                  : overallRate >= 40
                    ? "#fbbf24"
                    : "#f87171",
            }}
          >
            {overallRate}%
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Flame size={11} /> Best Active Streak
          </p>
          <p className="text-2xl font-bold text-orange-400">
            {bestStreakHabit?.streak ?? 0}
            <span className="text-slate-500 text-xs font-normal ml-1">
              days
            </span>
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Award size={11} /> Longest Ever
          </p>
          <p className="text-2xl font-bold text-brand-purple">
            {Math.max(0, ...habits.map((h) => h.longest_streak))}
            <span className="text-slate-500 text-xs font-normal ml-1">
              days
            </span>
          </p>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl overflow-hidden border border-surface-border">
          {(["cards", "stats"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-4 py-1.5 text-xs capitalize transition-colors",
                view === v
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : "text-slate-400 hover:text-white",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Habit
        </Button>
      </div>

      {/* ── Cards view ── */}
      {view === "cards" && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {habits.map((habit) => {
              const done = isCompletedToday(habit.id);
              const rate = completionRate(habit.id, completions, days30);
              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    "glass rounded-2xl p-4 border transition-all",
                    done ? "border-brand-green/20" : "border-transparent",
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggle(habit)}
                      className="flex-shrink-0 transition-transform active:scale-90"
                    >
                      {done ? (
                        <CheckCircle size={26} className="text-brand-green" />
                      ) : (
                        <Circle
                          size={26}
                          className="text-slate-600 hover:text-slate-400 transition-colors"
                        />
                      )}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p
                          className={cn(
                            "text-sm font-semibold transition-colors",
                            done ? "text-slate-400" : "text-white",
                          )}
                        >
                          {habit.name}
                        </p>
                        <Badge
                          variant={
                            habit.frequency === "daily" ? "cyan" : "purple"
                          }
                          size="sm"
                        >
                          {habit.frequency}
                        </Badge>
                      </div>
                      {habit.description && (
                        <p className="text-xs text-slate-500 mb-2">
                          {habit.description}
                        </p>
                      )}

                      {/* 30-day heatmap */}
                      <div className="flex gap-0.5 flex-wrap">
                        {days30.map((d) => {
                          const hit = completions.some(
                            (c) =>
                              c.habit_id === habit.id && c.completed_date === d,
                          );
                          return (
                            <div
                              key={d}
                              title={d}
                              className={cn(
                                "w-3 h-3 rounded-sm transition-colors",
                                hit ? "bg-brand-green" : "bg-surface-border",
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: streak + rate + delete */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {habit.streak > 0 && (
                          <div className="flex items-center gap-1 text-orange-400">
                            <Flame size={14} />
                            <span className="text-xs font-bold">
                              {habit.streak}d
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">
                          {rate}% this month
                        </p>
                        <div className="w-20 h-1 bg-surface-border rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-brand-green rounded-full transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {habits.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">
              <Flame size={32} className="mx-auto mb-3 opacity-30" />
              No habits yet. Build your routines.
            </div>
          )}
        </div>
      )}

      {/* ── Stats view (leaderboard) ── */}
      {view === "stats" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Habit Performance (30 days)
            </p>
          </div>
          {habits.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No habits to display
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {[...habits]
                .map((h) => ({
                  habit: h,
                  rate: completionRate(h.id, completions, days30),
                }))
                .sort((a, b) => b.rate - a.rate)
                .map(({ habit, rate }, i) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <span className="text-xs text-slate-600 w-5 text-center font-mono">
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {habit.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-green rounded-full transition-all"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">
                          {rate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-orange-400 flex-shrink-0">
                      <Flame size={12} />
                      <span className="text-xs font-semibold">
                        {habit.streak}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <HabitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={addHabit}
      />
    </div>
  );
}

/* ── Modal ────────────────────────────────────────────────── */
function HabitModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (h: Habit) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, frequency }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCreated(json.data);
      onClose();
      setName("");
      setDescription("");
      setFrequency("daily");
      toast.success("Habit created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Habit">
      <div className="space-y-4">
        <Input
          label="Habit Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read 20 pages"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
        <Select
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </Select>
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
