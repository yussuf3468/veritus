"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookOpen,
  Clock,
  Flame,
  Trophy,
  ChevronDown,
  ChevronUp,
  Trash2,
  Play,
  BarChart2,
  Target,
  Zap,
  X,
} from "lucide-react";
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
import type { LearningSubject, LearningSession } from "@/types";
import {
  format,
  subDays,
  parseISO,
  startOfDay,
  isSameDay,
  differenceInCalendarDays,
} from "date-fns";

interface Props {
  initialSubjects?: LearningSubject[];
  initialSessions?: LearningSession[];
}

/* ── helpers ─────────────────────────────────────────────── */
function minsToHours(m: number) {
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function pctColor(p: number) {
  return p >= 70 ? "#00ff88" : p >= 40 ? "#fbbf24" : "#f87171";
}

function buildHeatmap(sessions: LearningSession[], subjectId?: string) {
  // 10 weeks × 7 days = 70 squares (GitHub style)
  const days = Array.from({ length: 70 }, (_, i) => {
    const d = format(subDays(new Date(), 69 - i), "yyyy-MM-dd");
    const mins = sessions
      .filter(
        (s) =>
          s.date.substring(0, 10) === d &&
          (!subjectId || s.subject_id === subjectId),
      )
      .reduce((sum, s) => sum + s.duration_minutes, 0);
    return { date: d, mins };
  });
  return days;
}

export function LearningList({
  initialSubjects = [],
  initialSessions = [],
}: Props) {
  const [subjects, setSubjects] = useState<LearningSubject[]>(initialSubjects);
  const [sessions, setSessions] = useState<LearningSession[]>(initialSessions);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [view, setView] = useState<"subjects" | "heatmap" | "log">("subjects");
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showSessionModal, setShowSessionModal] =
    useState<LearningSubject | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(
    initialSubjects.length === 0,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/learning");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSubjects(json.data.subjects ?? []);
      setSessions(json.data.sessions ?? []);
    } catch {
      toast.error("Failed to load");
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSubjects.length > 0) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Aggregate stats ── */
  const totalMins = sessions.reduce((s, sess) => s + sess.duration_minutes, 0);
  const totalHours = Math.round(totalMins / 60);
  const thisWeekMins = sessions
    .filter((s) => differenceInCalendarDays(new Date(), parseISO(s.date)) < 7)
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  const longestHabit = useMemo<{
    subject: LearningSubject;
    streak: number;
  } | null>(() => {
    if (!subjects.length) return null;
    let best: { subject: LearningSubject; streak: number } | null = null;
    subjects.forEach((sub) => {
      let streak = 0,
        cur = 0;
      for (let i = 0; i < 30; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        const hasSession = sessions.some(
          (s) => s.subject_id === sub.id && s.date.substring(0, 10) === d,
        );
        if (hasSession) {
          cur++;
          streak = Math.max(streak, cur);
        } else cur = 0;
      }
      if (!best || streak > best.streak) best = { subject: sub, streak };
    });
    return best;
  }, [subjects, sessions]);

  /* ── Global heatmap (all sessions) ── */
  const heatmapData = useMemo(() => buildHeatmap(sessions), [sessions]);
  const maxMins = Math.max(1, ...heatmapData.map((d) => d.mins));

  async function deleteSubject(id: string) {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/learning/${id}`, { method: "DELETE" });
  }

  async function logSession(
    subjectId: string,
    durationMins: number,
    notes: string,
    date: string,
  ) {
    try {
      const res = await fetch(`/api/learning/${subjectId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration_minutes: durationMins, notes, date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSessions((prev) => [json.data, ...prev]);
      // Update logged_hours on subject optimistically
      const mins = subjectId ? durationMins : 0;
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? { ...s, logged_hours: s.logged_hours + mins / 60 }
            : s,
        ),
      );
      toast.success("Session logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (isInitialLoading)
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} className="h-32" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<BookOpen size={14} className="text-brand-cyan" />}
          label="Subjects"
          value={String(subjects.length)}
        />
        <StatCard
          icon={<Clock size={14} className="text-brand-purple" />}
          label="Total Hours"
          value={`${totalHours}h`}
        />
        <StatCard
          icon={<Zap size={14} className="text-brand-green" />}
          label="This Week"
          value={minsToHours(thisWeekMins)}
        />
        <StatCard
          icon={<Flame size={14} className="text-orange-400" />}
          label="Best Streak (30d)"
          value={longestHabit ? `${longestHabit.streak}d` : "0d"}
        />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl overflow-hidden border border-surface-border">
          {(["subjects", "heatmap", "log"] as const).map((v) => (
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
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowSubjectModal(true)}
        >
          <Plus size={13} /> New Subject
        </Button>
      </div>

      {/* ── Subjects ── */}
      {view === "subjects" && (
        <div className="space-y-3">
          {subjects.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">
              <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
              No subjects yet. Start learning!
            </div>
          )}
          <AnimatePresence mode="popLayout">
            {[...subjects]
              .sort((a, b) => b.logged_hours - a.logged_hours)
              .map((sub, idx) => {
                const subHeatmap = buildHeatmap(sessions, sub.id);
                const hMax = Math.max(1, ...subHeatmap.map((d) => d.mins));
                const subMins = sessions
                  .filter((s) => s.subject_id === sub.id)
                  .reduce((a, s) => a + s.duration_minutes, 0);
                const pct =
                  sub.target_hours > 0
                    ? Math.min(
                        100,
                        Math.round((sub.logged_hours / sub.target_hours) * 100),
                      )
                    : sub.progress;
                const isOpen = expanded === sub.id;

                return (
                  <motion.div
                    key={sub.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass rounded-2xl overflow-hidden"
                  >
                    {/* Subject header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface-border/30 transition-colors"
                      onClick={() => setExpanded(isOpen ? null : sub.id)}
                    >
                      <span className="text-xl">
                        {idx === 0
                          ? "🏆"
                          : idx === 1
                            ? "🥈"
                            : idx === 2
                              ? "🥉"
                              : "📖"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-white">
                            {sub.name}
                          </p>
                          {sub.category && (
                            <Badge variant="purple" size="sm">
                              {sub.category}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-surface-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: sub.color || "#00d4ff",
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">
                            {Math.round(sub.logged_hours)}h / {sub.target_hours}
                            h
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSessionModal(sub);
                        }}
                      >
                        <Play size={11} /> Log
                      </Button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSubject(sub.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                      {isOpen ? (
                        <ChevronUp size={14} className="text-slate-500" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-500" />
                      )}
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-surface-border px-4 pb-4 pt-3 space-y-3 overflow-hidden"
                        >
                          {sub.goal && (
                            <p className="text-xs text-slate-400">
                              Goal: {sub.goal}
                            </p>
                          )}
                          {sub.description && (
                            <p className="text-xs text-slate-500">
                              {sub.description}
                            </p>
                          )}

                          {/* Mini heatmap (10 wks) */}
                          <div>
                            <p className="text-[10px] text-slate-500 mb-2">
                              Activity (last 10 weeks)
                            </p>
                            <div className="grid grid-cols-[repeat(70,1fr)] gap-0.5">
                              {subHeatmap.map((d) => {
                                const intensity = Math.min(1, d.mins / hMax);
                                const color = sub.color || "#00d4ff";
                                return (
                                  <div
                                    key={d.date}
                                    title={`${d.date}: ${d.mins}m`}
                                    style={{
                                      background:
                                        d.mins > 0 ? color : "#1e2030",
                                      opacity:
                                        d.mins > 0 ? 0.2 + intensity * 0.8 : 1,
                                    }}
                                    className="w-full aspect-square rounded-[1px]"
                                  />
                                );
                              })}
                            </div>
                          </div>

                          {/* Recent sessions */}
                          {sessions.filter((s) => s.subject_id === sub.id)
                            .length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] text-slate-500">
                                Recent Sessions
                              </p>
                              {sessions
                                .filter((s) => s.subject_id === sub.id)
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .slice(0, 3)
                                .map((sess) => (
                                  <div
                                    key={sess.id}
                                    className="flex justify-between text-xs text-slate-400"
                                  >
                                    <span>{sess.notes || "Session"}</span>
                                    <span className="text-slate-500">
                                      {minsToHours(sess.duration_minutes)} ·{" "}
                                      {format(parseISO(sess.date), "MMM d")}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* Resources */}
                          {sub.resources.length > 0 && (
                            <div>
                              <p className="text-[10px] text-slate-500 mb-1">
                                Resources
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {sub.resources.map((r, i) => (
                                  <a
                                    key={i}
                                    href={r}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-brand-cyan hover:underline bg-brand-cyan/10 px-2 py-0.5 rounded"
                                  >
                                    {r.length > 30
                                      ? r.substring(0, 30) + "…"
                                      : r}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Heatmap (global) ── */}
      {view === "heatmap" && (
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-slate-400 mb-4">
            Study Activity — Last 10 Weeks
          </p>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, week) => (
              <div key={week} className="flex flex-col gap-1 flex-1">
                {Array.from({ length: 7 }, (_, day) => {
                  const cell = heatmapData[week * 7 + day];
                  if (!cell)
                    return (
                      <div
                        key={day}
                        className="aspect-square rounded-sm bg-transparent"
                      />
                    );
                  const intensity = Math.min(1, cell.mins / maxMins);
                  return (
                    <div
                      key={day}
                      title={`${cell.date}: ${cell.mins}m`}
                      style={{
                        background:
                          cell.mins > 0
                            ? `rgba(0,212,255,${0.1 + intensity * 0.9})`
                            : "#1e2030",
                      }}
                      className="aspect-square rounded-sm transition-colors"
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4 text-[10px] text-slate-500">
            <span>Less</span>
            {[0.1, 0.3, 0.5, 0.7, 1].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ background: `rgba(0,212,255,${i})` }}
              />
            ))}
            <span>More</span>
          </div>

          {/* Subject leaderboard */}
          <div className="mt-6 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Leaderboard</p>
            {[...subjects]
              .map((s) => ({
                s,
                mins: sessions
                  .filter((x) => x.subject_id === s.id)
                  .reduce((a, x) => a + x.duration_minutes, 0),
              }))
              .sort((a, b) => b.mins - a.mins)
              .map(({ s, mins }, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="text-xs w-5 text-slate-600 font-mono">
                    #{i + 1}
                  </span>
                  <span className="text-xs text-white flex-1">{s.name}</span>
                  <div className="w-24 h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (mins / Math.max(1, totalMins)) * 100)}%`,
                        background: s.color || "#00d4ff",
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {minsToHours(mins)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Session log ── */}
      {view === "log" && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              All Sessions
            </p>
          </div>
          {sessions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No sessions logged yet
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {[...sessions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((sess) => {
                  const sub = subjects.find((s) => s.id === sess.subject_id);
                  return (
                    <div
                      key={sess.id}
                      className="flex items-center gap-3 px-5 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white">
                          {sub?.name ?? "Unknown"}
                        </p>
                        {sess.notes && (
                          <p className="text-[10px] text-slate-500 truncate">
                            {sess.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-brand-cyan">
                          {minsToHours(sess.duration_minutes)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {format(parseISO(sess.date), "MMM d")}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      <AddSubjectModal
        open={showSubjectModal}
        onClose={() => setShowSubjectModal(false)}
        onCreated={(s) => setSubjects((prev) => [s, ...prev])}
      />
      {showSessionModal && (
        <LogSessionModal
          subject={showSessionModal}
          onClose={() => setShowSessionModal(null)}
          onLogged={(mins, notes, date) =>
            logSession(showSessionModal.id, mins, notes, date)
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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

function AddSubjectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (s: LearningSubject) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [targetHours, setTargetHours] = useState("10");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category: category || null,
          description: description || null,
          target_hours: parseInt(targetHours) || 10,
          goal: goal || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onCreated(json.data);
      onClose();
      setName("");
      setCategory("");
      setDescription("");
      setTargetHours("10");
      setGoal("");
      toast.success("Subject added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Subject">
      <div className="space-y-4">
        <Input
          label="Subject Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. TypeScript"
        />
        <Input
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Programming"
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Target Hours"
          type="number"
          value={targetHours}
          onChange={(e) => setTargetHours(e.target.value)}
        />
        <Input
          label="Goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. Build a full-stack app"
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={submit} loading={saving}>
            Add Subject
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function LogSessionModal({
  subject,
  onClose,
  onLogged,
}: {
  subject: LearningSubject;
  onClose: () => void;
  onLogged: (mins: number, notes: string, date: string) => void;
}) {
  const [mins, setMins] = useState("30");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!mins || parseInt(mins) <= 0) {
      toast.error("Enter duration");
      return;
    }
    setSaving(true);
    onLogged(parseInt(mins), notes, date);
    setSaving(false);
    onClose();
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Log Session — ${subject.name}`}
    >
      <div className="space-y-4">
        <Input
          label="Duration (minutes)"
          type="number"
          value={mins}
          onChange={(e) => setMins(e.target.value)}
        />
        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you study?"
        />
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
            Log
          </Button>
        </div>
      </div>
    </Modal>
  );
}
