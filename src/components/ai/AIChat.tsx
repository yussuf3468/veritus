"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Zap,
  Loader2,
  Bot,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Target,
  Trash2,
} from "lucide-react";
import { useUIStore } from "@/store/ui";
import { useMoneyStore } from "@/store/money";
import { useTaskStore } from "@/store/tasks";
import { useHabitStore } from "@/store/habits";
import { useGoalsStore } from "@/store/goals";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import type { Goal, Habit, Task, Transaction } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: { action?: string } & Record<string, unknown>;
}

const SUGGESTION_ITEMS: { text: string; Icon: React.ElementType }[] = [
  { text: "I got $100 from Ali", Icon: TrendingUp },
  { text: "I spent $20 on groceries", Icon: ShoppingCart },
  { text: "Summarize my day", Icon: BarChart3 },
  { text: "What should I focus on?", Icon: Target },
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      'Hi! I\'m your Veritus AI. I can summarize your day, add tasks, and record real money activity from normal language. Try **"I got $100 from Ali"** or **"I spent $20 on groceries"**.',
  },
];
const STORAGE_KEY = "veritus-ai-chat-v1";

function formatActionAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : Number.NaN;

  if (!Number.isFinite(amount)) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getActionBadges(action?: Message["action"]) {
  if (!action?.action) return [] as string[];

  const badges = [String(action.action).replace(/_/g, " ")];
  const amount = formatActionAmount(action.amount);
  if (amount) badges.push(amount);

  switch (action.action) {
    case "log_income":
      if (typeof action.category === "string" && action.category) {
        badges.push(action.category);
      }
      if (typeof action.source === "string" && action.source) {
        badges.push(`from ${action.source}`);
      }
      break;
    case "log_expense":
      if (typeof action.category === "string" && action.category) {
        badges.push(action.category);
      }
      if (typeof action.target === "string" && action.target) {
        badges.push(`for ${action.target}`);
      }
      break;
    case "add_task":
    case "add_goal":
      if (typeof action.title === "string" && action.title) {
        badges.push(action.title);
      }
      break;
    case "add_habit":
      if (typeof action.name === "string" && action.name) {
        badges.push(action.name);
      }
      break;
  }

  return badges;
}

export function AIChat() {
  const { aiChatOpen, toggleAIChat, setAIChat } = useUIStore();
  const addTransaction = useMoneyStore((state) => state.addTransaction);
  const addTask = useTaskStore((state) => state.addTask);
  const addHabit = useHabitStore((state) => state.addHabit);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const resizeComposer = useCallback((element?: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "24px";
    element.style.height = `${Math.min(element.scrollHeight, 144)}px`;
  }, []);

  const clearChat = useCallback(() => {
    setMessages(DEFAULT_MESSAGES);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const syncActionResult = useCallback(
    (action: Message["action"], actionResult: unknown) => {
      if (!action?.action || !actionResult) return;

      switch (action.action) {
        case "log_income":
        case "log_expense":
          addTransaction(actionResult as Transaction);
          break;
        case "add_task":
          addTask(actionResult as Task);
          break;
        case "add_habit":
          addHabit(actionResult as Habit);
          break;
        case "add_goal":
          addGoal(actionResult as Goal);
          break;
      }
    },
    [addGoal, addHabit, addTask, addTransaction],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed);
      }
    } catch {
      // Ignore invalid local history.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages.slice(-20)),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (aiChatOpen) {
      const timeout = window.setTimeout(() => {
        inputRef.current?.focus();
        resizeComposer(inputRef.current);
      }, 120);
      return () => window.clearTimeout(timeout);
    }
  }, [aiChatOpen, resizeComposer]);

  useEffect(() => {
    if (!aiChatOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [aiChatOpen]);

  useEffect(() => {
    if (!aiChatOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAIChat(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aiChatOpen, setAIChat]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading) return;

      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
      };
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      setInput("");
      if (inputRef.current) {
        inputRef.current.style.height = "24px";
      }
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
        });

        const json = await res.json();
        if (res.status === 401) {
          throw new Error("Your session expired. Please sign in again.");
        }
        if (!res.ok) throw new Error(json.error ?? "AI error");

        const {
          content: aiContent,
          action,
          actionResult,
          actionError,
        } = json.data;

        const assistantMsg: Message = {
          id: Date.now().toString() + "_ai",
          role: "assistant",
          content: aiContent,
          action,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        syncActionResult(action, actionResult);

        // Show toast if action was executed
        if (actionResult) {
          const actionLabels: Record<string, string> = {
            add_task: "✅ Task added",
            log_expense: "💸 Expense logged",
            log_income: "💰 Income logged",
            add_habit: "⭐ Habit added",
            add_goal: "🎯 Goal created",
            add_note: "📝 Note saved",
          };
          const label = actionLabels[action?.action as string];
          if (label) toast.success(label);
        } else if (actionError) {
          toast.error(actionError);
        }
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Something went wrong";
        toast.error(errMsg);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + "_err",
            role: "assistant",
            content: `Sorry, I ran into an error: ${errMsg}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, syncActionResult],
  );

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {aiChatOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAIChat(false)}
            className="fixed inset-0 z-40 bg-slate-950/72 backdrop-blur-[6px]"
            aria-label="Close AI assistant"
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {aiChatOpen && (
          <motion.section
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[rgba(7,8,18,0.99)] overscroll-none md:inset-auto md:bottom-5 md:right-5 md:left-auto md:top-auto md:h-[min(760px,calc(100vh-4rem))] md:w-[480px] md:rounded-[30px] md:border md:border-white/[0.07] md:backdrop-blur-2xl md:shadow-[0_40px_100px_rgba(0,0,0,0.72),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.07)]"
            style={{
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Ambient glow blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden md:rounded-[30px]">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-purple/16 blur-[80px]" />
              <div className="absolute -left-12 -top-6 h-48 w-48 rounded-full bg-brand-cyan/10 blur-[70px]" />
            </div>
            {/* Top highlight stripe — desktop only */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-px bg-gradient-to-r from-transparent via-brand-cyan/45 to-transparent md:block" />

            {/* ── Header ─────────────────────────────── */}
            <div className="relative flex items-center gap-3 border-b border-white/6 px-4 py-3.5 md:px-5">
              {/* Avatar with pulse ring when thinking */}
              <div className="relative flex-shrink-0">
                <AnimatePresence>
                  {loading && (
                    <motion.div
                      key="pulse-ring"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1.35 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className="absolute inset-0 rounded-2xl bg-brand-cyan/20 blur-[6px]"
                    />
                  )}
                </AnimatePresence>
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan via-[#7c3aed] to-brand-purple shadow-[0_0_18px_rgba(0,212,255,0.22)]">
                  <Bot size={15} className="text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">Veritus AI</p>
                  {/* Animated status badge */}
                  <motion.div
                    key={loading ? "thinking" : "ready"}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                      loading
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-400"
                        : "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        loading
                          ? "animate-pulse bg-amber-400"
                          : "bg-emerald-400",
                      )}
                    />
                    {loading ? "Thinking…" : "Ready"}
                  </motion.div>
                </div>
                <p className="truncate text-[11px] text-slate-500">
                  Money · Tasks · Habits · Goals
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Clear chat */}
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/6 bg-white/3 text-slate-500 transition-all hover:border-rose-500/30 hover:bg-rose-500/8 hover:text-rose-400"
                >
                  <Trash2 size={13} />
                </button>
                {/* Close */}
                <button
                  onClick={() => setAIChat(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/6 bg-white/3 text-slate-400 transition-all hover:border-white/14 hover:bg-white/7 hover:text-white"
                  aria-label="Close AI assistant"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Messages ───────────────────────────── */}
            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 [scrollbar-color:rgba(255,255,255,0.07)_transparent] [scrollbar-width:thin] md:px-5">
              {/* Suggestion grid */}
              <div className="mb-5 grid grid-cols-2 gap-2">
                {SUGGESTION_ITEMS.map(({ text, Icon }) => (
                  <button
                    key={text}
                    onClick={() => send(text)}
                    disabled={loading}
                    className="flex items-start gap-2 rounded-[14px] border border-white/6 bg-white/[0.03] px-3 py-2.5 text-left transition-all hover:border-brand-cyan/22 hover:bg-brand-cyan/5 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Icon
                      size={12}
                      className="mt-0.5 flex-shrink-0 text-brand-cyan/55"
                    />
                    <span className="text-[11px] leading-snug text-slate-400">
                      {text}
                    </span>
                  </button>
                ))}
              </div>

              {/* Chat divider */}
              <div className="mb-5 flex items-center gap-2">
                <div className="h-px flex-1 bg-white/[0.05]" />
                <span className="text-[10px] font-medium tracking-wide text-slate-600">
                  CONVERSATION
                </span>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>

              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      "flex gap-2.5",
                      msg.role === "user" ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_10px_rgba(0,212,255,0.18)]">
                        <Bot size={11} className="text-white" />
                      </div>
                    )}
                    <div className="max-w-[88%] space-y-2">
                      <div
                        className={cn(
                          "break-words rounded-[18px] px-3.5 py-2.5 text-[13px] leading-[1.7] prose-veritus [&_p]:m-0",
                          msg.role === "user"
                            ? "rounded-tr-[5px] border border-brand-cyan/22 bg-gradient-to-br from-brand-cyan/18 to-brand-purple/12 text-white"
                            : "rounded-tl-[5px] border border-white/6 bg-white/[0.04] text-slate-200",
                        )}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {msg.action?.action && (
                        <div className="flex flex-wrap gap-1.5 px-0.5">
                          {getActionBadges(msg.action).map((badge, i) => (
                            <span
                              key={`${msg.id}-${badge}`}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                i === 0
                                  ? "border border-brand-cyan/28 bg-brand-cyan/12 text-brand-cyan"
                                  : "border border-white/7 bg-white/4 text-slate-400",
                              )}
                            >
                              {badge}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2.5"
                  >
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_10px_rgba(0,212,255,0.2)]">
                      <Bot size={11} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-[18px] rounded-tl-[5px] border border-white/6 bg-white/[0.04] px-4 py-3.5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
                    </div>
                  </motion.div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            {/* ── Composer ───────────────────────────── */}
            <div
              className="relative border-t border-white/6 px-3 pt-3 md:px-4"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
              }}
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-[24px] border transition-all duration-200",
                  composerFocused
                    ? "border-brand-cyan/35 bg-[linear-gradient(180deg,rgba(16,20,36,0.98),rgba(8,10,22,0.98))] shadow-[0_0_0_1px_rgba(0,212,255,0.08),0_18px_38px_rgba(0,0,0,0.28)]"
                    : "border-white/[0.08] bg-[linear-gradient(180deg,rgba(13,15,28,0.98),rgba(8,10,20,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
                )}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/35 to-transparent" />
                <div className="flex items-end gap-3 px-3.5 py-3">
                  <div
                    className={cn(
                      "mb-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[16px] border transition-all",
                      composerFocused
                        ? "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan shadow-[0_0_16px_rgba(0,212,255,0.1)]"
                        : "border-white/[0.06] bg-white/[0.03] text-slate-500",
                    )}
                  >
                    <Bot size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Ask Veritus AI
                      </span>
                      {input.length > 0 && (
                        <span
                          className={cn(
                            "text-[10px] tabular-nums",
                            input.length > 450
                              ? "text-rose-400"
                              : "text-slate-600",
                          )}
                        >
                          {input.length}/500
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "overflow-hidden rounded-[18px] border bg-[rgba(4,7,18,0.7)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-200",
                        composerFocused
                          ? "border-brand-cyan/30 shadow-[0_0_0_1px_rgba(0,212,255,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]"
                          : "border-white/[0.06]",
                      )}
                    >
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => {
                          setInput(e.target.value);
                          resizeComposer(e.currentTarget);
                        }}
                        onFocus={() => setComposerFocused(true)}
                        onBlur={() => setComposerFocused(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        rows={1}
                        maxLength={500}
                        placeholder="Ask anything. I can log money, create tasks, and plan your day."
                        className="max-h-36 min-h-[52px] w-full resize-none overflow-y-auto bg-transparent px-4 py-3 text-[14px] leading-6 text-white placeholder-slate-600 outline-none"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="relative mb-1 flex-shrink-0">
                    {input.trim() && !loading && (
                      <span className="absolute inset-0 rounded-[18px] bg-brand-cyan/16 blur-[10px]" />
                    )}
                    <button
                      onClick={() => send()}
                      disabled={!input.trim() || loading}
                      className={cn(
                        "relative flex h-11 w-11 items-center justify-center rounded-[18px] transition-all duration-150",
                        input.trim() && !loading
                          ? "bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-[0_0_20px_rgba(0,212,255,0.28)] hover:scale-[1.03] hover:shadow-[0_0_28px_rgba(0,212,255,0.38)]"
                          : "cursor-not-allowed bg-white/[0.04] text-slate-700",
                      )}
                    >
                      {loading ? (
                        <Loader2
                          size={15}
                          className="animate-spin text-brand-cyan"
                        />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-slate-600">
                <span>
                  <kbd className="font-mono text-slate-700">Enter</kbd> to send
                  · <kbd className="font-mono text-slate-700">Shift+Enter</kbd>{" "}
                  for newline
                </span>
                <span className="hidden sm:inline">
                  Natural language works best
                </span>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Floating toggle button ──────────────────── */}
      <motion.button
        onClick={toggleAIChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        className={cn(
          "fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-[22px] text-white transition-all duration-200 md:flex",
          aiChatOpen
            ? "border border-white/8 bg-[rgba(16,18,32,0.96)] text-slate-300"
            : "bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_28px_rgba(0,212,255,0.24),0_8px_24px_rgba(0,0,0,0.4)]",
        )}
        aria-label="Toggle AI Chat"
      >
        <AnimatePresence mode="wait" initial={false}>
          {aiChatOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <X size={18} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              <Zap size={18} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
