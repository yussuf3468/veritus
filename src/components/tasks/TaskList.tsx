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
    <div className="space-y-5">
      <SkeletonStats count={4} />
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}

/* ─────────────────────────── Main ─────────────────────────── */
export function TaskList() {
  const { tasks, setTasks, addTask, updateTask, removeTask, setLoading } =
    useTaskStore();
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
    }
  }, [setTasks, setLoading]);

  useEffect(() => {
    load();
  }, [load]);

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
        toast.error("Failed");
      } else if (next === "completed") toast.success("Task done! 🎉");
    } catch {
      updateTask(task.id, { status: task.status });
    }
  }

  async function deleteTask(id: string) {
    removeTask(id);
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function toggleFocus(task: Task) {
    const next = !task.is_focus;
    updateTask(task.id, { is_focus: next });
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_focus: next }),
    });
  }

  const stats = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: tasks.filter(isOverdue).length,
      focus: tasks.filter((t) => t.is_focus).length,
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

  if (isLoading) return <TaskListSkeleton />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Pending",
            count: stats.pending,
            color: "#94a3b8",
            tab: "pending" as StatusTab,
          },
          {
            label: "In Progress",
            count: stats.inProgress,
            color: "#00d4ff",
            tab: "in_progress" as StatusTab,
          },
          {
            label: "Completed",
            count: stats.completed,
            color: "#00ff88",
            tab: "completed" as StatusTab,
          },
          {
            label: "Overdue",
            count: stats.overdue,
            color: "#f87171",
            tab: "all" as StatusTab,
          },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() =>
              setStatusTab((prev) =>
                prev === s.tab && s.tab !== "all" ? "all" : s.tab,
              )
            }
            className={cn(
              "glass rounded-xl p-3 text-left border transition-all hover:border-white/10",
              statusTab === s.tab && s.tab !== "all"
                ? "border-white/20"
                : "border-transparent",
            )}
          >
            <p className="text-2xl font-bold" style={{ color: s.color }}>
              {s.count}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full bg-bg-secondary border border-surface-border rounded-xl pl-9 pr-9 py-2 text-sm text-white placeholder-slate-600 focus:border-brand-cyan/50 outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setFocusMode((v) => !v)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all",
              focusMode
                ? "border-orange-500/50 text-orange-400 bg-orange-400/10"
                : "border-surface-border text-slate-400 hover:text-white",
            )}
          >
            <Flame size={12} /> Focus {focusMode && `(${stats.focus})`}
          </button>
          <div className="flex rounded-xl overflow-hidden border border-surface-border">
            {(["list", "kanban"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs flex items-center gap-1.5 transition-colors",
                  view === v
                    ? "bg-brand-cyan/10 text-brand-cyan"
                    : "text-slate-400 hover:text-white",
                )}
              >
                {v === "list" ? <List size={12} /> : <SquareKanban size={12} />}
                {v === "list" ? "List" : "Board"}
              </button>
            ))}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            <Plus size={13} /> New
          </Button>
        </div>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter((t) => (t === tag ? null : tag))}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] border transition-all flex items-center gap-1",
                tagFilter === tag
                  ? "border-brand-cyan/50 text-brand-cyan bg-brand-cyan/10"
                  : "border-surface-border text-slate-500 hover:text-white",
              )}
            >
              <Tag size={8} /> {tag}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="px-2.5 py-1 rounded-full text-[10px] text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-all"
            >
              ✕ clear
            </button>
          )}
        </div>
      )}

      {/* View */}
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
      <div className="text-center py-16 text-slate-500 text-sm">
        <CheckCircle2 size={36} className="mx-auto mb-3 opacity-20" />
        <p>No tasks match your filters.</p>
      </div>
    );

  return (
    <div className="space-y-6">
      {sections.map((sec) => (
        <div key={sec.key}>
          <div className="flex items-center gap-2 mb-2.5">
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
            <span className="text-xs text-slate-600">({sec.tasks.length})</span>
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
        </div>
      ))}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 mb-2.5"
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
        </div>
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
}: TVProps & { task: Task; dimmed?: boolean }) {
  const overdue = isOverdue(task);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={cn(
        "glass glass-hover rounded-xl px-4 py-3 flex items-start gap-3 group border-l-2 transition-all",
        task.priority === "urgent"
          ? "border-l-red-400"
          : task.priority === "high"
            ? "border-l-orange-400"
            : task.priority === "medium"
              ? "border-l-yellow-400"
              : "border-l-slate-700",
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
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize",
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
              className="text-[10px] text-slate-500 bg-surface-border px-1.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
          {task.ai_suggested && (
            <span className="text-[10px] text-brand-purple">✦ AI</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onFocus(task)}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            task.is_focus
              ? "text-orange-400 bg-orange-400/10"
              : "text-slate-500 hover:text-orange-400 hover:bg-orange-400/10",
          )}
        >
          <Flame size={13} />
        </button>
        <button
          onClick={() => onEdit(task)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-colors"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="glass rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: col.color }}
              />
              <span className="text-xs font-bold text-white">{col.label}</span>
              <span className="ml-auto text-xs text-slate-500 bg-surface-border px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
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
                <div className="text-center py-8 text-slate-700 text-xs border-2 border-dashed border-surface-border rounded-xl">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  task,
  onCycle,
  onDelete,
  onEdit,
}: TVProps & { task: Task }) {
  const overdue = isOverdue(task);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      onClick={() => onEdit(task)}
      className={cn(
        "bg-bg-primary border rounded-xl p-3 group cursor-pointer hover:border-white/20 transition-all",
        overdue ? "border-red-400/30" : "border-surface-border",
      )}
    >
      <p
        className={cn(
          "text-xs font-medium text-white leading-snug mb-2",
          task.status === "completed" && "line-through text-slate-500",
        )}
      >
        {task.is_focus && (
          <Flame size={10} className="inline text-orange-400 mr-1" />
        )}
        {task.title}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span
          className={cn(
            "text-[9px] px-1.5 py-0.5 rounded border font-medium capitalize",
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
        className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onCycle(task)}
          className="flex-1 text-[9px] py-1 rounded bg-surface-border hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1"
        >
          <ArrowRight size={9} /> Move →
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <Trash2 size={10} />
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
