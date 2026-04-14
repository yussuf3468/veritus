"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Flame,
  Clock,
  Search,
  SquareKanban,
  List,
  Edit2,
  ArrowRight,
  X,
  Tag,
  ChevronDown,
  AlertOctagon,
  Timer,
  RefreshCw,
} from "lucide-react";
import { useTaskStore } from "@/store/tasks";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import {
  Skeleton,
  SkeletonStats,
  SkeletonList,
} from "@/components/ui/Skeleton";
import { getPriorityColor, formatDate, cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Task } from "@/types";
import { isPast, isToday, isTomorrow, isThisWeek, parseISO } from "date-fns";

type ViewMode = "list" | "kanban";
type StatusTab = "all" | "pending" | "in_progress" | "completed";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_NEXT: Record<string, Task["status"]> = {
  pending: "in_progress",
  in_progress: "completed",
  completed: "pending",
  cancelled: "pending",
};

function isOverdue(task: Task) {
  if (
    !task.due_date ||
    task.status === "completed" ||
    task.status === "cancelled"
  )
    return false;
  return isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
}

function groupByDue(tasks: Task[]) {
  const g = {
    overdue: [] as Task[],
    today: [] as Task[],
    tomorrow: [] as Task[],
    week: [] as Task[],
    later: [] as Task[],
    none: [] as Task[],
  };
  tasks.forEach((t) => {
    if (!t.due_date) {
      g.none.push(t);
      return;
    }
    const d = parseISO(t.due_date);
    if (isPast(d) && !isToday(d)) g.overdue.push(t);
    else if (isToday(d)) g.today.push(t);
    else if (isTomorrow(d)) g.tomorrow.push(t);
    else if (isThisWeek(d, { weekStartsOn: 1 })) g.week.push(t);
    else g.later.push(t);
  });
  return g;
}

/* ── Skeleton ─────────────────────────────────────────────── */
function TaskListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[30px] border border-white/8 bg-[#08111d]/90 p-5 shadow-[0_24px_80px_rgba(4,9,20,0.42)] backdrop-blur-xl sm:p-6">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="mt-4 h-10 w-full max-w-xl rounded-2xl" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl rounded-full" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl rounded-full" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonStats count={4} />
        </div>
      </div>
      <div className="rounded-[30px] border border-white/8 bg-[#09111d]/82 p-5 shadow-[0_22px_70px_rgba(4,9,20,0.36)] backdrop-blur-xl sm:p-6">
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="h-11 w-24 rounded-2xl" />
          <Skeleton className="h-11 w-24 rounded-2xl" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="mt-5">
          <SkeletonList rows={6} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main ─────────────────────────── */
type TaskListProps = {
  initialTasks?: Task[];
  initialLoaded?: boolean;
};

export function TaskList({
  initialTasks = [],
  initialLoaded = false,
}: TaskListProps) {
  const { tasks, setTasks, addTask, updateTask, removeTask, setLoading } =
    useTaskStore();
  const [isLoading, setIsLoading] = useState(!initialLoaded);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const load = useCallback(
    async (showSkeleton = false) => {
      if (showSkeleton) setIsLoading(true);
      setLoading(true);
      setIsRefreshing(true);
      try {
        const res = await fetch("/api/tasks");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        setTasks(j.data);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [setTasks, setLoading],
  );

  useEffect(() => {
    if (initialLoaded) {
      setTasks(initialTasks);
      setIsLoading(false);
      return;
    }

    void load(true);
  }, [initialLoaded, initialTasks, load, setTasks]);

  async function cycleStatus(task: Task) {
    const next = STATUS_NEXT[task.status] ?? "pending";
    updateTask(task.id, { status: next });
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        updateTask(task.id, { status: task.status });
        toast.error("Failed to update task");
      } else if (next === "completed") toast.success("Task done! 🎉");
    } catch {
      updateTask(task.id, { status: task.status });
      toast.error("Failed to update task");
    }
  }

  async function deleteTask(id: string) {
    const previousTasks = tasks;
    removeTask(id);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(previousTasks);
      toast.error("Failed to delete task");
    }
  }

  async function toggleFocus(task: Task) {
    const next = !task.is_focus;
    updateTask(task.id, { is_focus: next });
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_focus: next }),
      });

      if (!res.ok) throw new Error();
    } catch {
      updateTask(task.id, { is_focus: task.is_focus });
      toast.error("Failed to update focus lane");
    }
  }

  const stats = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter(isOverdue).length,
      focus: tasks.filter(
        (t) =>
          t.is_focus && t.status !== "completed" && t.status !== "cancelled",
      ).length,
    }),
    [tasks],
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    tasks.forEach((t) => t.tags?.forEach((tag) => s.add(tag)));
    return Array.from(s);
  }, [tasks]);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (focusMode && !t.is_focus) return false;
        if (tagFilter && !t.tags?.includes(tagFilter)) return false;
        if (statusTab !== "all" && t.status !== statusTab) return false;
        return true;
      }),
    [tasks, search, focusMode, tagFilter, statusTab],
  );

  const sorted = [...filtered].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3),
  );

  const activeCount = useMemo(
    () =>
      tasks.filter(
        (task) => task.status !== "completed" && task.status !== "cancelled",
      ).length,
    [tasks],
  );

  const dueTodayCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.due_date &&
          task.status !== "completed" &&
          task.status !== "cancelled" &&
          isToday(parseISO(task.due_date)),
      ).length,
    [tasks],
  );

  const urgentCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.priority === "urgent" &&
          task.status !== "completed" &&
          task.status !== "cancelled",
      ).length,
    [tasks],
  );

  const completionRate = tasks.length
    ? Math.round((stats.completed / tasks.length) * 100)
    : 0;

  const focusHighlights = useMemo(
    () =>
      sorted
        .filter(
          (task) =>
            task.is_focus &&
            task.status !== "completed" &&
            task.status !== "cancelled",
        )
        .slice(0, 3),
    [sorted],
  );

  const nextDueTask = useMemo(() => {
    const dueTasks = tasks
      .filter(
        (task) =>
          task.due_date &&
          task.status !== "completed" &&
          task.status !== "cancelled",
      )
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

    return dueTasks[0] ?? null;
  }, [tasks]);

  const guidance = useMemo(() => {
    if (urgentCount > 0) {
      return {
        title: `You have ${urgentCount} urgent ${urgentCount === 1 ? "task" : "tasks"} demanding attention.`,
        body: "Clear the red lane first, then move one in-progress item across the line before opening anything new.",
      };
    }

    if (dueTodayCount > 0) {
      return {
        title: `There are ${dueTodayCount} ${dueTodayCount === 1 ? "task due" : "tasks due"} today.`,
        body: "Keep the day tight: finish due work first, then use the focus lane to protect the next meaningful block.",
      };
    }

    if (stats.inProgress > 0) {
      return {
        title: "Momentum is already underway.",
        body: "You have active work moving. Finish one item cleanly before expanding the queue.",
      };
    }

    if (stats.focus > 0) {
      return {
        title: "Your focus lane is ready.",
        body: "Stay inside the pinned queue and keep everything else parked until these priorities are done.",
      };
    }

    return {
      title: "The task board is calm and ready for the next move.",
      body: "Capture the next concrete action, keep the queue lean, and use focus mode when you want a smaller operating surface.",
    };
  }, [dueTodayCount, stats.focus, stats.inProgress, urgentCount]);

  const hasFilters = Boolean(
    search || focusMode || tagFilter || statusTab !== "all",
  );

  if (isLoading) return <TaskListSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#08111d]/90 p-5 shadow-[0_24px_80px_rgba(4,9,20,0.42)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.14),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.12),transparent_35%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
              <CheckCircle2 size={12} className="text-brand-cyan" />
              Task Command
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                {guidance.title}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-[15px]">
                {guidance.body}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {urgentCount > 0 && (
                <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-xs text-red-200">
                  {urgentCount} urgent in queue
                </span>
              )}
              {dueTodayCount > 0 && (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                  {dueTodayCount} due today
                </span>
              )}
              {nextDueTask?.due_date && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                  Next due: {formatDate(nextDueTask.due_date)}
                </span>
              )}
              {hasFilters && (
                <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs text-purple-100">
                  Filters active
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Momentum
                  </p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    {completionRate}%
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    completion rate across {tasks.length} tracked tasks
                  </p>
                </div>
                <CheckCircle2 size={20} className="text-brand-green" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-green"
                  style={{
                    width: `${Math.max(completionRate, tasks.length ? 8 : 0)}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                    Focus Lane
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {focusHighlights.length > 0
                      ? "Pinned work that deserves the next clean block."
                      : "No tasks pinned yet. Use the flame icon to build a smaller working lane."}
                  </p>
                </div>
                <Flame size={18} className="text-orange-400" />
              </div>

              {focusHighlights.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {focusHighlights.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setEditTask(task)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 text-left transition-colors hover:border-white/12"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {task.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {task.due_date
                            ? formatDate(task.due_date)
                            : "No due date"}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-slate-500" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TaskMetricCard
            label="Open Queue"
            value={String(activeCount)}
            description="tasks still active"
            icon={Circle}
            accent="#94a3b8"
          />
          <TaskMetricCard
            label="In Progress"
            value={String(stats.inProgress)}
            description="already moving"
            icon={Timer}
            accent="#00d4ff"
          />
          <TaskMetricCard
            label="Focus Items"
            value={String(stats.focus)}
            description="pinned for deep work"
            icon={Flame}
            accent="#fb923c"
          />
          <TaskMetricCard
            label="Overdue"
            value={String(stats.overdue)}
            description="need recovery"
            icon={AlertOctagon}
            accent="#f87171"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[30px] border border-white/8 bg-[#09111d]/82 shadow-[0_22px_70px_rgba(4,9,20,0.36)] backdrop-blur-xl">
        <div className="border-b border-white/6 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                Workspace Controls
              </p>
              <h2 className="text-lg font-semibold text-white">
                Filter, triage, and move the right queue
              </h2>
              <p className="text-sm text-slate-400">
                Switch between list and board views, isolate focus work, and
                keep the active lane clean.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={focusMode ? "outline" : "ghost"}
                size="sm"
                onClick={() => setFocusMode((value) => !value)}
                className={cn(
                  "rounded-xl border border-white/10 bg-white/[0.03]",
                  focusMode &&
                    "border-orange-400/40 bg-orange-400/10 text-orange-300",
                )}
              >
                <Flame size={13} /> Focus lane{" "}
                {stats.focus > 0 ? `(${stats.focus})` : ""}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => void load(false)}
                className="rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              >
                <RefreshCw
                  size={13}
                  className={cn(isRefreshing && "animate-spin")}
                />
                Refresh
              </Button>

              <div className="flex rounded-[14px] border border-white/10 bg-black/20 p-1">
                {(["list", "kanban"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setView(mode)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                      view === mode
                        ? "bg-brand-cyan/12 text-brand-cyan"
                        : "text-slate-400 hover:text-white",
                    )}
                  >
                    {mode === "list" ? (
                      <List size={12} />
                    ) : (
                      <SquareKanban size={12} />
                    )}
                    {mode === "list" ? "List" : "Board"}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowModal(true)}
                className="rounded-xl"
              >
                <Plus size={13} /> New task
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks, descriptions, and execution lanes"
                className="h-11 w-full rounded-2xl border border-white/8 bg-black/20 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-brand-cyan/40"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" as StatusTab },
                { label: "Pending", value: "pending" as StatusTab },
                { label: "In Progress", value: "in_progress" as StatusTab },
                { label: "Completed", value: "completed" as StatusTab },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusTab(tab.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    statusTab === tab.value
                      ? "border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan"
                      : "border-white/8 bg-white/[0.03] text-slate-400 hover:text-white",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTagFilter(null)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    !tagFilter
                      ? "border-white/18 bg-white/[0.05] text-white"
                      : "border-white/8 bg-white/[0.03] text-slate-400 hover:text-white",
                  )}
                >
                  All tags
                </button>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setTagFilter((current) => (current === tag ? null : tag))
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      tagFilter === tag
                        ? "border-brand-purple/30 bg-brand-purple/10 text-purple-100"
                        : "border-white/8 bg-white/[0.03] text-slate-400 hover:text-white",
                    )}
                  >
                    <Tag size={10} />
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {view === "list" ? (
            <ListView
              tasks={sorted}
              onCycle={cycleStatus}
              onDelete={deleteTask}
              onFocus={toggleFocus}
              onEdit={setEditTask}
            />
          ) : (
            <KanbanView
              tasks={sorted}
              onCycle={cycleStatus}
              onDelete={deleteTask}
              onFocus={toggleFocus}
              onEdit={setEditTask}
            />
          )}
        </div>
      </section>

      <TaskModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={addTask}
      />
      {editTask && (
        <TaskModal
          open
          task={editTask}
          onClose={() => setEditTask(null)}
          onCreated={() => {}}
          onUpdated={(updated) => {
            updateTask(updated.id, updated);
            setEditTask(null);
          }}
        />
      )}
    </div>
  );
}

function TaskMetricCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof CheckCircle2;
  accent: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold" style={{ color: accent }}>
            {value}
          </p>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <Icon size={18} style={{ color: accent }} />
      </div>
    </div>
  );
}

/* ─────────────────── Shared props type ─────────────────── */
type TVProps = {
  tasks: Task[];
  onCycle: (t: Task) => void;
  onDelete: (id: string) => void;
  onFocus: (t: Task) => void;
  onEdit: (t: Task) => void;
};

/* ─────────────────── List View ─────────────────── */
function ListView({ tasks, onCycle, onDelete, onFocus, onEdit }: TVProps) {
  const [showDone, setShowDone] = useState(false);
  const active = tasks.filter((t) => t.status !== "completed");
  const completed = tasks.filter((t) => t.status === "completed");
  const g = groupByDue(active);

  const sections = [
    {
      key: "overdue",
      label: "Overdue",
      tasks: g.overdue,
      color: "#f87171",
      icon: true,
    },
    {
      key: "today",
      label: "Today",
      tasks: g.today,
      color: "#00d4ff",
      icon: false,
    },
    {
      key: "tomorrow",
      label: "Tomorrow",
      tasks: g.tomorrow,
      color: "#7c3aed",
      icon: false,
    },
    {
      key: "week",
      label: "This Week",
      tasks: g.week,
      color: "#fbbf24",
      icon: false,
    },
    {
      key: "later",
      label: "Later",
      tasks: g.later,
      color: "#64748b",
      icon: false,
    },
    {
      key: "none",
      label: "No Due Date",
      tasks: g.none,
      color: "#475569",
      icon: false,
    },
  ].filter((s) => s.tasks.length > 0);

  if (tasks.length === 0)
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
        <CheckCircle2 size={36} className="mx-auto mb-4 text-slate-600" />
        <h3 className="text-base font-medium text-white">
          No tasks match this view.
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Clear a filter or create a new task to refill the lane.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      {sections.map((sec) => (
        <section
          key={sec.key}
          className="rounded-[24px] border border-white/6 bg-white/[0.02] p-3.5 sm:p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            {sec.icon && (
              <AlertOctagon size={12} style={{ color: sec.color }} />
            )}
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: sec.color }}
            />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: sec.color }}
            >
              {sec.label}
            </span>
            <span className="text-xs text-slate-500">({sec.tasks.length})</span>
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sec.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onCycle={onCycle}
                  onDelete={onDelete}
                  onFocus={onFocus}
                  onEdit={onEdit}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
      {completed.length > 0 && (
        <section className="rounded-[24px] border border-white/6 bg-white/[0.02] p-3.5 sm:p-4">
          <button
            onClick={() => setShowDone((v) => !v)}
            className="mb-2 flex items-center gap-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Completed ({completed.length})
            </span>
            <ChevronDown
              size={12}
              className={cn(
                "text-slate-500 transition-transform",
                showDone && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2">
                  {completed.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onCycle={onCycle}
                      onDelete={onDelete}
                      onFocus={onFocus}
                      onEdit={onEdit}
                      dimmed
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onCycle,
  onDelete,
  onFocus,
  onEdit,
  dimmed,
}: Omit<TVProps, "tasks"> & { task: Task; dimmed?: boolean }) {
  const overdue = isOverdue(task);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={cn(
        "group flex items-start gap-3 rounded-[20px] border bg-[#07101a]/80 px-4 py-3.5 shadow-[0_16px_40px_rgba(2,6,23,0.18)] transition-all hover:border-white/14",
        task.priority === "urgent"
          ? "border-l-[3px] border-l-red-400 border-red-400/18"
          : task.priority === "high"
            ? "border-l-[3px] border-l-orange-400 border-white/8"
            : task.priority === "medium"
              ? "border-l-[3px] border-l-yellow-400 border-white/8"
              : "border-l-[3px] border-l-slate-700 border-white/8",
        dimmed && "opacity-50",
      )}
    >
      <button onClick={() => onCycle(task)} className="mt-0.5 flex-shrink-0">
        {task.status === "completed" ? (
          <CheckCircle2 size={18} className="text-brand-green" />
        ) : task.status === "in_progress" ? (
          <div className="w-[18px] h-[18px] rounded-full border-2 border-brand-cyan flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
          </div>
        ) : (
          <Circle
            size={18}
            className="text-slate-600 hover:text-brand-green transition-colors"
          />
        )}
      </button>
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onEdit(task)}
      >
        <p
          className={cn(
            "text-sm font-medium text-white leading-snug",
            task.status === "completed" && "line-through text-slate-500",
          )}
        >
          {task.is_focus && (
            <Flame size={11} className="inline text-orange-400 mr-1" />
          )}
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2 py-1 text-[10px] font-medium capitalize",
              getPriorityColor(task.priority),
            )}
          >
            {task.priority}
          </span>
          {task.status === "in_progress" && (
            <span className="text-[10px] text-brand-cyan flex items-center gap-0.5">
              <Timer size={8} /> In Progress
            </span>
          )}
          {task.due_date && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px]",
                overdue ? "text-red-400" : "text-slate-500",
              )}
            >
              <Clock size={9} /> {overdue ? "Overdue · " : ""}
              {formatDate(task.due_date)}
            </span>
          )}
          {task.tags?.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/[0.04] px-2 py-1 text-[10px] text-slate-400"
            >
              #{tag}
            </span>
          ))}
          {task.ai_suggested && (
            <span className="rounded-full bg-brand-purple/10 px-2 py-1 text-[10px] text-purple-100">
              ✦ AI
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button
          onClick={() => onFocus(task)}
          className={cn(
            "rounded-xl p-2 transition-colors",
            task.is_focus
              ? "text-orange-400 bg-orange-400/10"
              : "text-slate-500 hover:text-orange-400 hover:bg-orange-400/10",
          )}
        >
          <Flame size={13} />
        </button>
        <button
          onClick={() => onEdit(task)}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-brand-cyan/10 hover:text-brand-cyan"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-400/10 hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────── Kanban Board ─────────────────── */
function KanbanView({ tasks, onCycle, onDelete, onFocus, onEdit }: TVProps) {
  const columns: { key: Task["status"]; label: string; color: string }[] = [
    { key: "pending", label: "Pending", color: "#94a3b8" },
    { key: "in_progress", label: "In Progress", color: "#00d4ff" },
    { key: "completed", label: "Completed", color: "#00ff88" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <section
            key={col.key}
            className="rounded-[24px] border border-white/6 bg-white/[0.02] p-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: col.color }}
              />
              <span className="text-xs font-bold text-white">{col.label}</span>
              <span className="ml-auto text-xs text-slate-500 bg-surface-border px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>
            <div className="min-h-[80px] space-y-2">
              <AnimatePresence mode="popLayout">
                {colTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onCycle={onCycle}
                    onDelete={onDelete}
                    onFocus={onFocus}
                    onEdit={onEdit}
                  />
                ))}
              </AnimatePresence>
              {colTasks.length === 0 && (
                <div className="rounded-[18px] border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-500">
                  Empty lane
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  onCycle,
  onDelete,
  onFocus,
  onEdit,
}: Omit<TVProps, "tasks"> & { task: Task }) {
  const overdue = isOverdue(task);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => onEdit(task)}
      className={cn(
        "group cursor-pointer rounded-[20px] border bg-[#07101a]/80 p-3.5 transition-all hover:border-white/14",
        overdue ? "border-red-400/24" : "border-white/8",
      )}
    >
      <p
        className={cn(
          "mb-2 text-sm font-medium leading-snug text-white",
          task.status === "completed" && "line-through text-slate-500",
        )}
      >
        {task.is_focus && (
          <Flame size={10} className="inline text-orange-400 mr-1" />
        )}
        {task.title}
      </p>
      {task.description && (
        <p className="mb-3 text-xs leading-5 text-slate-400">
          {task.description}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full border px-2 py-1 text-[9px] font-medium capitalize",
            getPriorityColor(task.priority),
          )}
        >
          {task.priority}
        </span>
        {task.due_date && (
          <span
            className={cn(
              "text-[9px] flex items-center gap-0.5",
              overdue ? "text-red-400" : "text-slate-500",
            )}
          >
            <Clock size={8} />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
      <div
        className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onCycle(task)}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2 text-[10px] text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white"
        >
          <ArrowRight size={10} />
          {task.status === "completed" ? "Reopen" : "Advance"}
        </button>
        <button
          onClick={() => onFocus(task)}
          className={cn(
            "rounded-xl p-2 transition-colors",
            task.is_focus
              ? "bg-orange-400/10 text-orange-300"
              : "text-slate-500 hover:bg-orange-400/10 hover:text-orange-300",
          )}
        >
          <Flame size={11} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="rounded-xl p-2 text-slate-500 transition-all hover:bg-red-400/10 hover:text-red-400"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}

/* ─────────────────── Modal ─────────────────── */
function TaskModal({
  open,
  onClose,
  onCreated,
  task,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (t: Task) => void;
  task?: Task | null;
  onUpdated?: (t: Task) => void;
}) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Task["priority"]>(
    task?.priority ?? "medium",
  );
  const [status, setStatus] = useState<Task["status"]>(
    task?.status ?? "pending",
  );
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [tagsInput, setTagsInput] = useState(task?.tags?.join(", ") ?? "");
  const [isFocus, setIsFocus] = useState(task?.is_focus ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setPriority(task?.priority ?? "medium");
    setStatus(task?.status ?? "pending");
    setDueDate(task?.due_date ?? "");
    setTagsInput(task?.tags?.join(", ") ?? "");
    setIsFocus(task?.is_focus ?? false);
  }, [task]);

  async function submit() {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const body = {
      title,
      description,
      priority,
      status,
      due_date: dueDate || null,
      tags,
      is_focus: isFocus,
    };
    try {
      const url = isEdit ? `/api/tasks/${task!.id}` : "/api/tasks";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      if (isEdit) {
        onUpdated?.(j.data);
        toast.success("Saved");
      } else {
        onCreated(j.data);
        toast.success("Task created");
      }
      onClose();
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
      title={isEdit ? "Edit Task" : "New Task"}
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details…"
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task["priority"])}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as Task["status"])}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </Select>
        </div>
        <Input
          label="Due Date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Input
          label="Tags (comma-separated)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="work, personal, urgent"
        />
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isFocus}
            onChange={(e) => setIsFocus(e.target.checked)}
            className="w-4 h-4 accent-orange-400 rounded"
          />
          <span className="text-sm text-slate-300 flex items-center gap-1">
            <Flame size={13} className="text-orange-400" /> Mark as Focus
          </span>
        </label>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={saving}>
            {isEdit ? "Save Changes" : "Create Task"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
