"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Zap, Loader2, Bot, Sparkles } from "lucide-react";
import { useUIStore } from "@/store/ui";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: Record<string, unknown>;
}

const SUGGESTIONS = [
  "Summarize my day",
  "What should I focus on?",
  "Add task: review budget",
  "Spending insights this month",
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      'Hi! I\'m your Veritus AI. I can summarize your day, add tasks, log money, create habits, and keep the whole system moving. Try **"summarize my day"** or **"add task: review budget"**.',
  },
];
const STORAGE_KEY = "veritus-ai-chat-v1";

export function AIChat() {
  const { aiChatOpen, toggleAIChat, setAIChat } = useUIStore();
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const timeout = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(timeout);
    }
  }, [aiChatOpen]);

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

        const { content: aiContent, action, actionResult } = json.data;

        const assistantMsg: Message = {
          id: Date.now().toString() + "_ai",
          role: "assistant",
          content: aiContent,
          action,
        };

        setMessages((prev) => [...prev, assistantMsg]);

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
    [input, loading, messages],
  );

  return (
    <>
      <AnimatePresence>
        {aiChatOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAIChat(false)}
            className="fixed inset-0 z-40 bg-slate-950/72 backdrop-blur-sm"
            aria-label="Close AI assistant"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiChatOpen && (
          <motion.section
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-3 top-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-[30px] border border-surface-border bg-[linear-gradient(180deg,rgba(18,18,34,0.98),rgba(8,8,15,0.98))] shadow-panel md:inset-auto md:bottom-6 md:right-6 md:left-auto md:top-auto md:h-[min(720px,calc(100vh-5rem))] md:w-[420px] md:rounded-[32px]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_top_left,rgba(0,212,255,0.15),transparent_32%)]" />

            <div className="relative flex items-center gap-3 border-b border-surface-border px-4 py-4 md:px-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-glow">
                <Bot size={13} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white md:text-base">
                  Veritus AI
                </p>
                <p className="text-[11px] text-slate-500">
                  Assistant for planning, capture, and execution
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="hidden items-center gap-1 rounded-full border border-surface-border bg-white/5 px-2 py-1 text-[10px] text-slate-400 sm:flex">
                  <Sparkles size={10} className="text-brand-cyan" />
                  Ready
                </div>
                <button
                  onClick={() => setAIChat(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-border bg-white/5 text-slate-300 transition-colors hover:text-white"
                  aria-label="Close AI assistant"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="relative flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-5">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="whitespace-nowrap rounded-full border border-brand-cyan/20 bg-brand-cyan/8 px-3 py-1.5 text-[11px] text-brand-cyan/80 transition-all hover:border-brand-cyan/50 hover:bg-brand-cyan/12 hover:text-brand-cyan"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple text-white">
                      <Bot size={10} className="text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-[22px] px-3.5 py-2.5 text-sm prose-veritus md:max-w-[82%]",
                      msg.role === "user"
                        ? "rounded-tr-md border border-brand-cyan/25 bg-brand-cyan/14 text-white"
                        : "rounded-tl-md border border-surface-border bg-white/5 text-slate-200",
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                    {msg.action?.action && (
                      <div className="mt-1.5 pt-1.5 border-t border-surface-border">
                        <span className="text-[10px] text-brand-cyan opacity-70">
                          Action: {String(msg.action.action).replace(/_/g, " ")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 items-center">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple text-white">
                    <Bot size={10} className="text-white" />
                  </div>
                  <div className="rounded-[22px] rounded-tl-md border border-surface-border bg-white/5 px-3 py-2">
                    <Loader2
                      size={14}
                      className="animate-spin text-brand-cyan"
                    />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
              </div>
            </div>

            <div className="relative border-t border-surface-border px-3 pb-3 pt-3 md:px-4 md:pb-4">
              <div className="flex items-center gap-2 rounded-[24px] border border-surface-border bg-white/5 px-3 py-2.5 transition-colors focus-within:border-brand-cyan/40">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder='Ask anything or say "add task…"'
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none"
                  disabled={loading}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleAIChat}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "fixed right-6 bottom-6 z-40 hidden h-14 w-14 items-center justify-center rounded-[22px] text-white shadow-panel transition-all md:flex",
          aiChatOpen
            ? "border border-surface-border bg-bg-elevated text-slate-300"
            : "bg-gradient-to-br from-brand-cyan to-brand-purple shadow-glow",
        )}
        aria-label="Toggle AI Chat"
      >
        {aiChatOpen ? <X size={18} /> : <Zap size={18} />}
      </motion.button>
    </>
  );
}
