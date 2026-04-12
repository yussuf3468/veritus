"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Target,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  Tag,
  Filter,
  Award,
} from "lucide-react";
import { useGoalsStore } from "@/store/goals";
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
import type { Goal, GoalMilestone, GoalStatus, GoalType } from "@/types";
import { format, parseISO, isPast, differenceInDays } from "date-fns";

interface Props {
  initialGoals?: Goal[];
}

const STATUS_COLORS: Record<GoalStatus, string> = {
  active: "text-brand-cyan border-brand-cyan/20 bg-brand-cyan/10",
  completed: "text-brand-green border-brand-green/20 bg-brand-green/10",
  paused: "text-yellow-400 border-yellow-400/20 bg-yellow-400/10",
  cancelled: "text-slate-500 border-slate-500/20 bg-slate-500/10",
};

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
  cancelled: "Cancelled",
};

function daysLeft(deadline: string | null) {
  if (!deadline) return null;
  const d = differenceInDays(parseISO(deadline), new Date());
  return d;
}

export function GoalList({ initialGoals = [] }: Props) {
  const {
    goals,
    setGoals,
    addGoal,
    removeGoal,
    updateGoal,
    addMilestone,
    toggleMilestone,
    setLoading,
  } = useGoalsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<GoalStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<GoalType | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [newMsGoal, setNewMsGoal] = useState<Goal | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setGoals(json.data.goals ?? json.data);
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  }, [setGoals, setLoading]);

  useEffect(() => {
    if (initialGoals.length > 0) {
      setGoals(initialGoals);
      setIsLoading(false);
    } else load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      goals.filter(
        (g) =>
          (statusFilter === "all" || g.status === statusFilter) &&
          (typeFilter === "all" || g.type === typeFilter),
      ),
    [goals, statusFilter, typeFilter],
  );

  /* ── Stats ── */
  const completed = goals.filter((g) => g.status === "completed").length;
  const active = goals.filter((g) => g.status === "active").length;
  const avgProgress = goals.length
    ? Math.round(
        goals
          .filter((g) => g.status === "active")
          .reduce((s, g) => s + g.progress, 0) / Math.max(1, active),
      )
    : 0;

  async function handleToggleMilestone(
    goalId: string,
    msId: string,
    current: boolean,
  ) {
    toggleMilestone(goalId, msId, !current);
    try {
      await fetch(`/api/goals/${goalId}/milestones/${msId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !current }),
      });
    } catch {
      toggleMilestone(goalId, msId, current); // revert
    }
  }

  async function handleDeleteGoal(id: string) {
    removeGoal(id);
    await fetch(`/api/goals/${id}`, { method: "DELETE" });
  }

  async function handleUpdateProgress(goal: Goal, newProgress: number) {
    const clamped = Math.min(100, Math.max(0, newProgress));
    updateGoal(goal.id, {
      progress: clamped,
      status: clamped >= 100 ? "completed" : goal.status,
    });
    await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress: clamped }),
    });
  }

  if (isLoading)
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total"
          value={goals.length}
          icon={<Target size={14} className="text-brand-cyan" />}
        />
        <StatCard
          label="Active"
          value={active}
          icon={<Flame size={14} className="text-orange-400" />}
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={<Award size={14} className="text-brand-green" />}
        />
        <StatCard
          label="Avg Progress"
          value={`${avgProgress}%`}
          icon={<CheckCircle2 size={14} className="text-brand-purple" />}
        />
      </div>

      {/* ── Filters + Add ── */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "completed", "paused", "cancelled"] as const).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs capitalize border transition-all",
                  statusFilter === s
                    ? "border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan"
                    : "border-surface-border text-slate-400 hover:text-white",
                )}
              >
                {s}
              </button>
            ),
          )}
          <button
            onClick={() =>
              setTypeFilter(
                typeFilter === "all"
                  ? "long_term"
                  : typeFilter === "long_term"
                    ? "short_term"
                    : "all",
              )
            }
            className={cn(
              "px-3 py-1 rounded-full text-xs border transition-all",
              typeFilter !== "all"
                ? "border-brand-purple/50 bg-brand-purple/10 text-brand-purple"
                : "border-surface-border text-slate-400 hover:text-white",
            )}
          >
            <Filter size={9} className="inline mr-1" />
            {typeFilter === "all"
              ? "All Types"
              : typeFilter === "long_term"
                ? "Long-term"
                : "Short-term"}
          </button>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus size={13} /> New Goal
        </Button>
      </div>

      {/* ── Goal cards ── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          <Target size={32} className="mx-auto mb-3 opacity-30" />
          No goals yet. Set your first goal!
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {filtered.map((goal) => {
          const isOpen = expanded === goal.id;
          const ms = goal.milestones ?? [];
          const msComplete = ms.filter((m) => m.completed).length;
          const dl = daysLeft(goal.deadline);

          return (
            <motion.div
              key={goal.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "glass rounded-2xl overflow-hidden border transition-all",
                goal.status === "completed"
                  ? "border-brand-green/20"
                  : "border-transparent",
              )}
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Progress ring */}
                  <div className="flex-shrink-0 relative w-11 h-11">
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 44 44"
                    >
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke="#1e2030"
                        strokeWidth="4"
                      />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke={
                          goal.status === "completed" ? "#00ff88" : "#00d4ff"
                        }
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${(2 * Math.PI * 18 * goal.progress) / 100} ${2 * Math.PI * 18 * (1 - goal.progress / 100)}`}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                      {goal.progress}%
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-white">
                        {goal.title}
                      </p>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border",
                          STATUS_COLORS[goal.status],
                        )}
                      >
                        {STATUS_LABELS[goal.status]}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border border-surface-border text-slate-400",
                        )}
                      >
                        {goal.type === "long_term" ? "Long-term" : "Short-term"}
                      </span>
                      {goal.category && (
                        <Badge variant="purple" size="sm">
                          {goal.category}
                        </Badge>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-xs text-slate-500 mb-2">
                        {goal.description}
                      </p>
                    )}

                    {/* Progress bar / slider */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={goal.progress}
                        onChange={(e) =>
                          handleUpdateProgress(goal, parseInt(e.target.value))
                        }
                        className="flex-1 h-1.5 accent-brand-cyan cursor-pointer"
                      />
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      {goal.deadline && (
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            dl !== null && dl < 0
                              ? "text-red-400"
                              : dl !== null && dl <= 7
                                ? "text-yellow-400"
                                : "",
                          )}
                        >
                          <Clock size={9} />
                          {dl === null
                            ? ""
                            : dl < 0
                              ? `${Math.abs(dl)}d overdue`
                              : dl === 0
                                ? "Due today"
                                : `${dl}d left`}{" "}
                          ({format(parseISO(goal.deadline), "MMM d yyyy")})
                        </span>
                      )}
                      {ms.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={9} />
                          {msComplete}/{ms.length} milestones
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setNewMsGoal(goal)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      onClick={() => setEditGoal(goal)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                    {ms.length > 0 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : goal.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all"
                      >
                        {isOpen ? (
                          <ChevronUp size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Milestones */}
              <AnimatePresence>
                {isOpen && ms.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-surface-border overflow-hidden"
                  >
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                        Milestones
                      </p>
                      {ms.map((m) => (
                        <div key={m.id} className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleToggleMilestone(goal.id, m.id, m.completed)
                            }
                            className="flex-shrink-0"
                          >
                            {m.completed ? (
                              <CheckCircle2
                                size={15}
                                className="text-brand-green"
                              />
                            ) : (
                              <Circle
                                size={15}
                                className="text-slate-600 hover:text-slate-400 transition-colors"
                              />
                            )}
                          </button>
                          <p
                            className={cn(
                              "text-xs flex-1",
                              m.completed
                                ? "line-through text-slate-500"
                                : "text-white",
                            )}
                          >
                            {m.title}
                          </p>
                          {m.due_date && (
                            <p className="text-[10px] text-slate-600">
                              {format(parseISO(m.due_date), "MMM d")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <GoalModal
        open={showModal || editGoal !== null}
        goal={editGoal}
        onClose={() => {
          setShowModal(false);
          setEditGoal(null);
        }}
        onSaved={(g) => {
          editGoal ? updateGoal(g.id, g) : addGoal(g);
          setShowModal(false);
          setEditGoal(null);
          load();
        }}
      />
      {newMsGoal && (
        <MilestoneModal
          goal={newMsGoal}
          onClose={() => setNewMsGoal(null)}
          onCreated={(ms) => {
            addMilestone(newMsGoal.id, ms);
            setNewMsGoal(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function GoalModal({
  open,
  goal,
  onClose,
  onSaved,
}: {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSaved: (g: Goal) => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [desc, setDesc] = useState(goal?.description ?? "");
  const [type, setType] = useState<GoalType>(goal?.type ?? "short_term");
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "active");
  const [deadline, setDeadline] = useState(
    goal?.deadline?.substring(0, 10) ?? "",
  );
  const [category, setCategory] = useState(goal?.category ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(goal?.title ?? "");
    setDesc(goal?.description ?? "");
    setType(goal?.type ?? "short_term");
    setStatus(goal?.status ?? "active");
    setDeadline(goal?.deadline?.substring(0, 10) ?? "");
    setCategory(goal?.category ?? "");
  }, [goal]);

  async function submit() {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title,
        description: desc || null,
        type,
        status,
        deadline: deadline || null,
        category: category || null,
      };
      const res = goal
        ? await fetch(`/api/goals/${goal.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/goals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved(json.data);
      toast.success(goal ? "Goal updated" : "Goal created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? "Edit Goal" : "New Goal"}
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title"
        />
        <Input
          label="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Optional"
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.target.value as GoalType)}
          >
            <option value="short_term">Short-term</option>
            <option value="long_term">Long-term</option>
          </Select>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as GoalStatus)}
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        <Input
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Health, Career"
        />
        <Input
          label="Deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={saving}>
            {goal ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function MilestoneModal({
  goal,
  onClose,
  onCreated,
}: {
  goal: Goal;
  onClose: () => void;
  onCreated: (ms: GoalMilestone) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, due_date: dueDate || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCreated(json.data);
      toast.success("Milestone added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Add Milestone — ${goal.title}`}
    >
      <div className="space-y-4">
        <Input
          label="Milestone"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to happen?"
          autoFocus
        />
        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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
