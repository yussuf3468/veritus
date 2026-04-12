"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Tag,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  LayoutGrid,
  LayoutList,
  X,
  Save,
  Hash,
  Link2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Note } from "@/types";
import { format, parseISO } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  initialNotes?: Note[];
}

export function NoteList({ initialNotes = [] }: Props) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [isInitialLoading, setIsInitialLoading] = useState(
    initialNotes.length === 0,
  );
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setNotes(json.data);
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialNotes.length > 0) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── All unique tags ── */
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  /* ── Filtered notes ── */
  const filtered = useMemo(() => {
    let list = [...notes];
    if (search)
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
      );
    if (tagFilter) list = list.filter((n) => n.tags.includes(tagFilter));
    // Pinned first
    return list.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [notes, search, tagFilter]);

  /* ── Stats ── */
  const wordCount = notes.reduce(
    (s, n) => s + n.content.split(/\s+/).filter(Boolean).length,
    0,
  );
  const pinned = notes.filter((n) => n.is_pinned).length;

  async function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  }

  async function togglePin(note: Note) {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n,
      ),
    );
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !note.is_pinned }),
    });
  }

  function onSaved(note: Note, isEdit: boolean) {
    if (isEdit)
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    else setNotes((prev) => [note, ...prev]);
    setEditNote(null);
    setShowNew(false);
  }

  if (isInitialLoading)
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-9 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} className="h-44" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3">
          <p className="text-[10px] text-slate-400 mb-0.5">Notes</p>
          <p className="text-xl font-bold text-white">{notes.length}</p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-[10px] text-slate-400 mb-0.5">Total Words</p>
          <p className="text-xl font-bold text-brand-cyan">
            {wordCount.toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-xl p-3">
          <p className="text-[10px] text-slate-400 mb-0.5">Pinned</p>
          <p className="text-xl font-bold text-yellow-400">{pinned}</p>
        </div>
      </div>

      {/* ── Search + controls ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-secondary rounded-xl border border-surface-border text-white placeholder-slate-500 focus:outline-none focus:border-brand-cyan/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="flex rounded-xl overflow-hidden border border-surface-border">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "px-3 py-2 transition-colors",
              view === "grid"
                ? "bg-brand-cyan/10 text-brand-cyan"
                : "text-slate-500 hover:text-white",
            )}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-3 py-2 transition-colors",
              view === "list"
                ? "bg-brand-cyan/10 text-brand-cyan"
                : "text-slate-500 hover:text-white",
            )}
          >
            <LayoutList size={14} />
          </button>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowNew(true)}>
          <Plus size={13} /> Note
        </Button>
      </div>

      {/* ── Tag chips ── */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTagFilter(null)}
            className={cn(
              "px-3 py-1 rounded-full text-xs border transition-all",
              tagFilter === null
                ? "border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan"
                : "border-surface-border text-slate-500 hover:text-white",
            )}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={cn(
                "px-3 py-1 rounded-full text-xs border transition-all flex items-center gap-1",
                tagFilter === tag
                  ? "border-brand-purple/50 bg-brand-purple/10 text-brand-purple"
                  : "border-surface-border text-slate-500 hover:text-white",
              )}
            >
              <Hash size={9} />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          <FileText size={32} className="mx-auto mb-3 opacity-30" />
          {search || tagFilter
            ? "No notes match your search."
            : "No notes yet. Capture your thoughts."}
        </div>
      )}

      {/* ── Grid view ── */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((note) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "glass rounded-2xl p-4 cursor-pointer group hover:border-brand-cyan/20 border border-transparent transition-all",
                  note.is_pinned ? "border-yellow-400/20" : "",
                )}
                onClick={() => setPreview(note)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white line-clamp-1 flex-1 mr-2">
                    {note.title}
                  </h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePin(note);
                      }}
                      className="p-1 text-slate-500 hover:text-yellow-400 transition-colors"
                    >
                      {note.is_pinned ? (
                        <PinOff size={12} />
                      ) : (
                        <Pin size={12} />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditNote(note);
                      }}
                      className="p-1 text-slate-500 hover:text-brand-cyan transition-colors"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-3 mb-3">
                  {note.content}
                </p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple border border-brand-purple/20"
                      >
                        #{t}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span className="text-[9px] text-slate-600">
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-slate-600">
                  {format(parseISO(note.updated_at), "MMM d, yyyy")}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── List view ── */}
      {view === "list" && (
        <div className="glass rounded-2xl overflow-hidden">
          <AnimatePresence mode="popLayout">
            {filtered.map((note, i) => (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-surface-border/30 transition-colors group",
                  i !== 0 && "border-t border-surface-border",
                )}
                onClick={() => setPreview(note)}
              >
                {note.is_pinned && (
                  <Pin size={11} className="text-yellow-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {note.title}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {note.content.substring(0, 80)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {note.tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-brand-purple/10 text-brand-purple"
                    >
                      #{t}
                    </span>
                  ))}
                  <p className="text-[10px] text-slate-600">
                    {format(parseISO(note.updated_at), "MMM d")}
                  </p>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditNote(note);
                      }}
                      className="p-1 text-slate-500 hover:text-brand-cyan transition-colors"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Preview modal ── */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold text-white">
                  {preview.title}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditNote(preview);
                      setPreview(null);
                    }}
                  >
                    <Edit3 size={12} /> Edit
                  </Button>
                  <button
                    onClick={() => setPreview(null)}
                    className="p-1.5 text-slate-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {preview.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {preview.tags.map((t) => (
                    <span
                      key={t}
                      className="text-xs px-2 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple border border-brand-purple/20"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {preview.content}
                </ReactMarkdown>
              </div>
              <p className="text-xs text-slate-600 mt-4">
                Updated{" "}
                {format(parseISO(preview.updated_at), "MMM d, yyyy HH:mm")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <NoteEditor
        open={showNew || editNote !== null}
        note={editNote}
        onClose={() => {
          setShowNew(false);
          setEditNote(null);
        }}
        onSaved={onSaved}
      />
    </div>
  );
}

/* ── NoteEditor ──────────────────────────────────────────── */
function NoteEditor({
  open,
  note,
  onClose,
  onSaved,
}: {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onSaved: (n: Note, isEdit: boolean) => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [tagsRaw, setTagsRaw] = useState((note?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setTagsRaw((note?.tags ?? []).join(", "));
    setPreview(false);
    setTimeout(() => textRef.current?.focus(), 50);
  }, [note, open]);

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  async function save() {
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    try {
      const payload = { title, content, tags };
      const res = note
        ? await fetch(`/api/notes/${note.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved(json.data, note !== null);
      toast.success(note ? "Note updated" : "Note created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass rounded-2xl p-5 w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title…"
            className="text-lg font-bold bg-transparent text-white placeholder-slate-600 focus:outline-none flex-1 mr-4"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs transition-colors border",
                preview
                  ? "border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan"
                  : "border-surface-border text-slate-400 hover:text-white",
              )}
            >
              Preview
            </button>
            <Button variant="primary" size="sm" onClick={save} loading={saving}>
              <Save size={12} /> Save
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tags input */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
          <Hash size={12} className="text-brand-purple flex-shrink-0" />
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="Tags (comma-separated, e.g. ideas, work, project)"
            className="flex-1 text-xs bg-transparent text-slate-300 placeholder-slate-600 focus:outline-none"
          />
          <span className="text-[10px] text-slate-600">{wordCount} words</span>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 overflow-y-auto min-h-[200px]">
          {preview ? (
            <div className="prose prose-sm prose-invert max-w-none">
              {content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              ) : (
                <p className="text-slate-600 italic">Nothing to preview yet…</p>
              )}
            </div>
          ) : (
            <textarea
              ref={textRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing… (Markdown supported)"
              className="w-full h-full min-h-[200px] bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed font-mono"
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
