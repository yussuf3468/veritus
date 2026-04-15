"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  Bot,
  FileText,
  TrendingUp,
  ShoppingCart,
  BarChart3,
  Target,
  Trash2,
  Globe,
  ExternalLink,
  Pin,
  Sparkles,
  Command,
  ArrowUpRight,
  Wand2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { useUIStore } from "@/store/ui";
import { useMoneyStore } from "@/store/money";
import { useTaskStore } from "@/store/tasks";
import { useHabitStore } from "@/store/habits";
import { useGoalsStore } from "@/store/goals";
import { cn, formatCurrency } from "@/lib/utils";
import type { AIFollowUpAction, Goal, Habit, Task, Transaction } from "@/types";

type ActionPayload = { action?: string } & Record<string, unknown>;

type MemoryItem = {
  source: "chat" | "note";
  title?: string;
  content: string;
  createdAt: string;
};

type SourceItem = {
  title: string;
  url: string;
  snippet: string;
  provider: string;
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: ActionPayload;
  memories?: MemoryItem[];
  sources?: SourceItem[];
  followUps?: AIFollowUpAction[];
}

type AIChatProps = {
  mode?: "overlay" | "page";
};

const STORAGE_KEY = "veritus-ai-chat-v1";
const PINNED_PRESETS_KEY = "veritus-ai-pinned-presets-v1";
const MAX_PINNED_PRESETS = 6;

const SUGGESTION_ITEMS: { text: string; Icon: React.ElementType }[] = [
  { text: "I got KSh 1,000 from Ali", Icon: TrendingUp },
  { text: "I spent KSh 500 on groceries", Icon: ShoppingCart },
  {
    text: "Run my morning brief across tasks, money, habits, and goals.",
    Icon: Sparkles,
  },
  { text: "What should I focus on first, and why?", Icon: Target },
  {
    text: "Build a recovery plan for my overdue and urgent work.",
    Icon: Wand2,
  },
  { text: "What did we decide about my budget last time?", Icon: FileText },
  {
    text: "Run my weekly reset across tasks, money, habits, goals, and notes.",
    Icon: BarChart3,
  },
  { text: "Look up the latest budgeting apps and compare them.", Icon: Globe },
];

const PRIMARY_AI_COMMANDS: Array<{
  label: string;
  hint: string;
  description: string;
  prompt: string;
  Icon: React.ElementType;
  tone: string;
}> = [
  {
    label: "Prioritize",
    hint: "Decision lane",
    description: "Turn the current queue into the best next move.",
    prompt: "What should I focus on first, and why?",
    Icon: Target,
    tone: "border-brand-cyan/18 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.16),transparent_45%),rgba(255,255,255,0.02)] text-brand-cyan",
  },
  {
    label: "Automate",
    hint: "Phase 2",
    description:
      "Run morning briefs, recovery plans, and weekly resets across the whole system.",
    prompt: "Run my morning brief across tasks, money, habits, and goals.",
    Icon: Sparkles,
    tone: "border-amber-400/18 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_45%),rgba(255,255,255,0.02)] text-amber-200",
  },
  {
    label: "Research",
    hint: "Live web",
    description: "Ground the answer in current external sources.",
    prompt: "Look up the latest budgeting apps and compare them.",
    Icon: Globe,
    tone: "border-fuchsia-400/18 bg-[radial-gradient(circle_at_top_left,rgba(192,132,252,0.16),transparent_45%),rgba(255,255,255,0.02)] text-fuchsia-200",
  },
  {
    label: "Operate",
    hint: "Action engine",
    description: "Turn advice into tasks, plans, and saved actions.",
    prompt: "Plan my day around my tasks and habits.",
    Icon: Wand2,
    tone: "border-emerald-400/18 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_45%),rgba(255,255,255,0.02)] text-emerald-200",
  },
];

const DEFAULT_PINNED_PROMPTS = [
  "What should I focus on first, and why?",
  "What did we decide about my budget last time?",
  "Run my morning brief across tasks, money, habits, and goals.",
  "Build a recovery plan for my overdue and urgent work.",
  "Run my weekly reset across tasks, money, habits, goals, and notes.",
];

const DEFAULT_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      'Hi! I\'m your Veritus AI. Phase 2 is now automation-focused: I can run morning briefs, recovery plans, weekly resets, search the web with sources, pull relevant memories from past chats and notes, add tasks, and record money activity from normal language. Try **"run my morning brief"**, **"build a recovery plan for my overdue work"**, or **"what should I focus on first, and why?"**.',
  },
];

function createMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizePinnedPrompts(prompts: string[]) {
  return Array.from(
    new Set(prompts.map((prompt) => prompt.trim()).filter(Boolean)),
  ).slice(0, MAX_PINNED_PRESETS);
}

function normalizeLoadedMessages(messages: Message[]) {
  const cleaned = messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

  return cleaned.length > 0
    ? [DEFAULT_MESSAGES[0], ...cleaned]
    : DEFAULT_MESSAGES;
}

function formatMemoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Saved memory";

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatMemoryPreview(value: string, length = 110) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length - 3).trimEnd()}...`;
}

function formatActionAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : Number.NaN;

  if (!Number.isFinite(amount)) return null;

  return formatCurrency(amount, "KES");
}

function getActionBadges(action?: ActionPayload) {
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
    case "add_note":
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

export function AIChat({ mode = "overlay" }: AIChatProps) {
  const isPage = mode === "page";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { aiChatOpen, setAIChat } = useUIStore();
  const addTransaction = useMoneyStore((state) => state.addTransaction);
  const addTask = useTaskStore((state) => state.addTask);
  const addHabit = useHabitStore((state) => state.addHabit);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFollowUpId, setActiveFollowUpId] = useState<string | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const [pinnedPrompts, setPinnedPrompts] = useState<string[]>(
    DEFAULT_PINNED_PROMPTS,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handledRoutePromptRef = useRef<string | null>(null);

  const hasConversation = useMemo(
    () => messages.some((message) => message.id !== "welcome"),
    [messages],
  );

  const latestAssistantMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (message) => message.role === "assistant" && message.id !== "welcome",
        ) ?? null,
    [messages],
  );

  const latestSources = latestAssistantMessage?.sources ?? [];
  const latestMemories = latestAssistantMessage?.memories ?? [];
  const latestActionBadges = latestAssistantMessage?.action
    ? getActionBadges(latestAssistantMessage.action)
    : [];
  const draftIsPinned = !!input.trim() && pinnedPrompts.includes(input.trim());

  const sessionStats = useMemo(
    () => ({
      messages: Math.max(messages.length - 1, 0),
      memories: messages.reduce(
        (sum, message) => sum + (message.memories?.length ?? 0),
        0,
      ),
      sources: messages.reduce(
        (sum, message) => sum + (message.sources?.length ?? 0),
        0,
      ),
      actions: messages.reduce(
        (sum, message) => sum + (message.action?.action ? 1 : 0),
        0,
      ),
    }),
    [messages],
  );

  const radarItems = [
    {
      label: "Messages",
      value: String(sessionStats.messages),
      detail: "conversation turns",
    },
    {
      label: "Memories",
      value: String(sessionStats.memories),
      detail: "retrieval hits",
    },
    {
      label: "Sources",
      value: String(sessionStats.sources),
      detail: "citations surfaced",
    },
    {
      label: "Actions",
      value: String(sessionStats.actions),
      detail: "workspace writes suggested",
    },
  ];

  const shortcutItems = [
    "Ctrl/Cmd+K focuses the composer.",
    "Ctrl/Cmd+Enter sends the current draft.",
    "Ctrl/Cmd+1-4 loads the command lanes.",
    "Ctrl/Cmd+Shift+P pins the current draft.",
  ];

  const resizeComposer = useCallback((element?: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = "24px";
    element.style.height = `${Math.min(element.scrollHeight, 144)}px`;
  }, []);

  const focusComposer = useCallback(() => {
    inputRef.current?.focus();
    resizeComposer(inputRef.current);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [resizeComposer]);

  const prefillPrompt = useCallback(
    (prompt: string) => {
      setInput(prompt);
      window.requestAnimationFrame(() => {
        focusComposer();
      });
    },
    [focusComposer],
  );

  const togglePinnedPrompt = useCallback((prompt: string) => {
    const cleanedPrompt = prompt.trim();
    if (!cleanedPrompt) return;

    setPinnedPrompts((current) => {
      if (current.includes(cleanedPrompt)) {
        return current.filter((item) => item !== cleanedPrompt);
      }

      return normalizePinnedPrompts([cleanedPrompt, ...current]);
    });
  }, []);

  const clearChat = useCallback(async () => {
    setMessages(DEFAULT_MESSAGES);
    setInput("");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }

    try {
      const res = await fetch("/api/ai", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("AI memory cleared");
    } catch {
      toast.error(
        "Local chat cleared, but server history could not be removed.",
      );
    }
  }, []);

  const loadRemoteHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/ai?limit=24", { cache: "no-store" });
      if (!res.ok) return;

      const json = await res.json();
      const remoteMessages = Array.isArray(json.data?.messages)
        ? (json.data.messages as Message[])
        : [];

      if (remoteMessages.length === 0) return;

      setMessages((current) => {
        const currentConversation = current.filter(
          (message) => message.id !== "welcome",
        );

        if (currentConversation.length > remoteMessages.length) {
          return current;
        }

        return normalizeLoadedMessages(remoteMessages);
      });
    } catch {
      // Ignore remote history failures.
    }
  }, []);

  const syncActionResult = useCallback(
    (action: ActionPayload | undefined, actionResult: unknown) => {
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

  const syncFollowUpResult = useCallback(
    (endpoint: string, result: unknown) => {
      if (!result || typeof result !== "object") return;

      if (endpoint.startsWith("/api/tasks")) {
        addTask(result as Task);
        return;
      }

      if (endpoint.startsWith("/api/money")) {
        addTransaction(result as Transaction);
        return;
      }

      if (endpoint.startsWith("/api/habits")) {
        addHabit(result as Habit);
        return;
      }

      if (endpoint.startsWith("/api/goals")) {
        addGoal(result as Goal);
      }
    },
    [addGoal, addHabit, addTask, addTransaction],
  );

  const appendAssistantMessage = useCallback((content: string) => {
    setMessages((current) =>
      normalizeLoadedMessages([
        ...current.filter((message) => message.id !== "welcome"),
        {
          id: createMessageId(),
          role: "assistant",
          content,
        },
      ]),
    );
  }, []);

  const handleFollowUpAction = useCallback(
    async (followUp: AIFollowUpAction) => {
      if (followUp.kind === "prefill") {
        prefillPrompt(followUp.prompt);
        return;
      }

      if (followUp.kind === "link") {
        if (!isPage) {
          setAIChat(false);
        }

        router.push(followUp.href);
        return;
      }

      setActiveFollowUpId(followUp.id);
      try {
        const res = await fetch(followUp.endpoint, {
          method: followUp.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(followUp.payload),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof json.error === "string"
              ? json.error
              : "Unable to run that follow-up right now.",
          );
        }

        const result = json.data;
        syncFollowUpResult(followUp.endpoint, result);

        if (followUp.successMessage) {
          appendAssistantMessage(followUp.successMessage);
          toast.success(followUp.successMessage);
        } else {
          toast.success("Follow-up action completed.");
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Unable to run that follow-up right now.";
        toast.error(message);
      } finally {
        setActiveFollowUpId(null);
      }
    },
    [
      appendAssistantMessage,
      isPage,
      prefillPrompt,
      router,
      setAIChat,
      syncFollowUpResult,
    ],
  );

  const send = useCallback(
    async (override?: string) => {
      const content = (override ?? input).trim();
      if (!content || loading) return;

      const userMessage: Message = {
        id: createMessageId(),
        role: "user",
        content,
      };

      const outgoingMessages = [
        ...messages
          .filter((message) => message.id !== "welcome")
          .map(({ role, content: previousContent }) => ({
            role,
            content: previousContent,
          })),
        { role: "user" as const, content },
      ];

      setMessages((current) =>
        normalizeLoadedMessages([
          ...current.filter((message) => message.id !== "welcome"),
          userMessage,
        ]),
      );
      setInput("");
      window.requestAnimationFrame(() => {
        resizeComposer(inputRef.current);
      });
      setLoading(true);

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: outgoingMessages }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(
            typeof json.error === "string"
              ? json.error
              : "Unable to reach Veritus AI right now.",
          );
        }

        const data = json.data ?? {};
        const assistantMessage: Message = {
          id: createMessageId(),
          role: "assistant",
          content:
            typeof data.content === "string" && data.content.trim()
              ? data.content
              : "I reached the AI route, but the reply was empty.",
          action:
            data.action && typeof data.action === "object"
              ? (data.action as ActionPayload)
              : undefined,
          memories: Array.isArray(data.memories)
            ? (data.memories as MemoryItem[])
            : undefined,
          sources: Array.isArray(data.sources)
            ? (data.sources as SourceItem[])
            : undefined,
          followUps: Array.isArray(data.followUps)
            ? (data.followUps as AIFollowUpAction[])
            : undefined,
        };

        setMessages((current) =>
          normalizeLoadedMessages([
            ...current.filter((message) => message.id !== "welcome"),
            assistantMessage,
          ]),
        );

        syncActionResult(assistantMessage.action, data.actionResult);

        if (data.actionError && typeof data.actionError === "string") {
          toast.error(data.actionError);
        } else if (assistantMessage.action?.action && data.actionResult) {
          toast.success("Veritus AI updated your workspace.");
        }
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Unable to reach Veritus AI right now.";

        setMessages((current) =>
          normalizeLoadedMessages([
            ...current.filter((entry) => entry.id !== "welcome"),
            {
              id: createMessageId(),
              role: "assistant",
              content: `I hit a problem while processing that request. ${message}`,
            },
          ]),
        );
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, resizeComposer, syncActionResult],
  );

  const handlePromptTrigger = useCallback(
    (prompt: string) => {
      prefillPrompt(prompt);
    },
    [prefillPrompt],
  );

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Message[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(normalizeLoadedMessages(parsed));
      }
    } catch {
      // Ignore invalid local history.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PINNED_PRESETS_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setPinnedPrompts(normalizePinnedPrompts(parsed));
      }
    } catch {
      // Ignore invalid preset storage.
    }
  }, []);

  useEffect(() => {
    void loadRemoteHistory();
  }, [loadRemoteHistory]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          messages.filter((message) => message.id !== "welcome").slice(-40),
        ),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [messages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PINNED_PRESETS_KEY,
        JSON.stringify(pinnedPrompts),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [pinnedPrompts]);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [messages, loading]);

  useEffect(() => {
    resizeComposer(inputRef.current);
  }, [input, resizeComposer]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const overlayActive = !isPage && aiChatOpen;
      const workspaceActive = isPage || overlayActive;
      if (!workspaceActive) return;

      const isModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (!isPage && aiChatOpen && event.key === "Escape") {
        event.preventDefault();
        setAIChat(false);
        return;
      }

      if (isModifier && key === "k") {
        event.preventDefault();
        focusComposer();
        return;
      }

      if (isModifier && event.key === "Enter") {
        if (!loading && input.trim()) {
          event.preventDefault();
          void send();
        }
        return;
      }

      if (isModifier && event.shiftKey && key === "p") {
        if (input.trim()) {
          event.preventDefault();
          togglePinnedPrompt(input.trim());
        }
        return;
      }

      if (isModifier && /^[1-4]$/.test(event.key)) {
        const commandIndex = Number(event.key) - 1;
        const command = PRIMARY_AI_COMMANDS[commandIndex];
        if (!command) return;

        event.preventDefault();
        prefillPrompt(command.prompt);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    aiChatOpen,
    focusComposer,
    input,
    isPage,
    loading,
    prefillPrompt,
    send,
    setAIChat,
    togglePinnedPrompt,
  ]);

  useEffect(() => {
    if (!isPage) return;

    const routePrompt = searchParams.get("prompt")?.trim();
    const autorun = searchParams.get("autorun") === "1";

    if (!routePrompt) {
      handledRoutePromptRef.current = null;
      return;
    }

    const promptKey = `${routePrompt}::${autorun ? "run" : "prefill"}`;
    if (handledRoutePromptRef.current === promptKey) {
      return;
    }

    handledRoutePromptRef.current = promptKey;

    if (autorun) {
      void send(routePrompt);
    } else {
      prefillPrompt(routePrompt);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("prompt");
    nextParams.delete("autorun");

    router.replace(
      nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname,
      { scroll: false },
    );
  }, [isPage, pathname, prefillPrompt, router, searchParams, send]);

  const pinnedPromptStrip = pinnedPrompts.length > 0 && (
    <motion.div
      layout
      className="space-y-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
        <Pin size={11} className="text-brand-cyan/70" />
        Pinned Presets
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pinnedPrompts.map((prompt) => (
          <div
            key={prompt}
            className="flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] pr-1 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <button
              onClick={() => prefillPrompt(prompt)}
              className="max-w-[240px] truncate px-3 py-1.5 text-[11px] transition-colors hover:text-white"
            >
              {prompt}
            </button>
            <button
              onClick={() => togglePinnedPrompt(prompt)}
              className="rounded-full border border-transparent p-1 text-slate-500 transition-colors hover:border-white/8 hover:bg-white/[0.05] hover:text-white"
              aria-label={`Unpin ${prompt}`}
            >
              <Pin size={11} className="fill-current" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );

  const conversationThread = (
    <div className="space-y-4">
      {!hasConversation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
            isPage ? "p-4 sm:p-5" : "p-4",
          )}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-brand-cyan">
                <Sparkles size={11} />
                {isPage ? "Thread Stage" : "Mobile AI Deck"}
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-[26px] sm:leading-[1.15]">
                {isPage
                  ? "Choose a reasoning lane, then shape the prompt before you send it."
                  : "Ask fast, pin the prompts you reuse, and keep the whole session in view."}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Veritus AI now keeps memory, source cards, action signals, and
                automation runs visible so the workspace feels continuous
                instead of disposable.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 xl:w-[340px]">
              {[
                {
                  label: "Session",
                  value: String(sessionStats.messages),
                  note: "messages",
                },
                {
                  label: "Memory",
                  value: String(sessionStats.memories),
                  note: "recall hits",
                },
                {
                  label: "Sources",
                  value: String(sessionStats.sources),
                  note: "citations",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[18px] border border-white/8 bg-black/20 px-2.5 py-2.5 sm:px-3 sm:py-3"
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-white">
                    {item.value}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={cn(
              "flex gap-2.5",
              message.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            {message.role === "assistant" && (
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_10px_rgba(0,212,255,0.18)]">
                <Bot size={12} className="text-white" />
              </div>
            )}

            <div
              className={cn(
                "min-w-0 space-y-2",
                isPage
                  ? "max-w-[calc(100%-2.5rem)] sm:max-w-[94%] 2xl:max-w-[84%]"
                  : "max-w-[88%]",
              )}
            >
              <div
                className={cn(
                  "overflow-hidden break-words rounded-[20px] px-4 py-3 text-[13px] leading-[1.8] prose-veritus [&_p]:m-0",
                  message.role === "user"
                    ? "rounded-tr-[6px] border border-brand-cyan/22 bg-gradient-to-br from-brand-cyan/18 via-brand-cyan/10 to-brand-purple/12 text-white shadow-[0_14px_32px_rgba(0,212,255,0.08)]"
                    : "rounded-tl-[6px] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] text-slate-200 shadow-[0_16px_36px_rgba(0,0,0,0.18)]",
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>

              {message.action?.action && (
                <div className="flex flex-wrap gap-1.5 px-0.5">
                  {getActionBadges(message.action).map((badge, index) => (
                    <span
                      key={`${message.id}-${badge}`}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        index === 0
                          ? "border border-brand-cyan/28 bg-brand-cyan/12 text-brand-cyan"
                          : "border border-white/7 bg-white/4 text-slate-400",
                      )}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {message.followUps && message.followUps.length > 0 && (
                <div className="flex flex-wrap gap-2 px-0.5">
                  {message.followUps.map((followUp) => (
                    <button
                      key={`${message.id}-${followUp.id}`}
                      onClick={() => void handleFollowUpAction(followUp)}
                      disabled={activeFollowUpId === followUp.id}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60",
                        followUp.style === "warning"
                          ? "border border-amber-400/24 bg-amber-400/10 text-amber-100 hover:border-amber-300/40"
                          : followUp.style === "secondary"
                            ? "border border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:text-white"
                            : "border border-brand-cyan/24 bg-brand-cyan/12 text-brand-cyan hover:border-brand-cyan/40",
                      )}
                    >
                      {activeFollowUpId === followUp.id
                        ? "Running..."
                        : followUp.label}
                    </button>
                  ))}
                </div>
              )}

              {message.memories && message.memories.length > 0 && (
                <div className="space-y-2 px-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                    <Bot size={11} className="text-brand-cyan/70" />
                    Memory Used
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {message.memories.map((memory, index) => (
                      <div
                        key={`${message.id}-memory-${index}-${memory.createdAt}`}
                        className="w-full max-w-full rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 sm:max-w-[260px]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em]",
                              memory.source === "note"
                                ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                                : "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
                            )}
                          >
                            {memory.source === "note" ? (
                              <FileText size={10} />
                            ) : (
                              <Bot size={10} />
                            )}
                            {memory.source}
                          </span>
                          <span className="text-[9px] uppercase tracking-[0.12em] text-slate-600">
                            {formatMemoryDate(memory.createdAt)}
                          </span>
                        </div>
                        {memory.title && (
                          <div className="mt-2 text-[11px] font-medium text-slate-200">
                            {memory.title}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] leading-5 text-slate-500">
                          {formatMemoryPreview(memory.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {message.sources && message.sources.length > 0 && (
                <div className="space-y-2 px-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                    <Globe size={11} className="text-brand-cyan/70" />
                    Sources
                  </div>
                  <div className="grid gap-2">
                    {message.sources.map((source) => (
                      <a
                        key={`${message.id}-${source.url}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="group rounded-[16px] border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 transition-all hover:border-brand-cyan/20 hover:bg-brand-cyan/[0.04]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[11px] font-medium text-slate-200 group-hover:text-white">
                              {source.title}
                            </div>
                            <div className="mt-1 line-clamp-2 text-[10px] leading-5 text-slate-500">
                              {source.snippet}
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-1.5 py-1 text-[9px] uppercase tracking-[0.14em] text-slate-500">
                            {source.provider}
                            <ExternalLink size={10} />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2.5"
        >
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple shadow-[0_0_10px_rgba(0,212,255,0.2)]">
            <Bot size={12} className="text-white" />
          </div>
          <div className="flex items-center gap-1.5 rounded-[20px] rounded-tl-[6px] border border-white/6 bg-white/[0.04] px-4 py-3.5">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
          </div>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );

  const mobileIntelDeck = (
    <div className="space-y-2 xl:hidden">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
        <Sparkles size={11} className="text-brand-cyan/70" />
        Live Intelligence
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pl-0.5 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="w-[84vw] max-w-[360px] snap-start rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-white">
            <Bot size={15} className="text-brand-cyan" />
            <p className="text-sm font-semibold">Session Radar</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {radarItems.map((item) => (
              <div
                key={item.label}
                className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3"
              >
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  {item.label}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {item.value}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="w-[84vw] max-w-[360px] snap-start rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-white">
            <FileText size={15} className="text-amber-300" />
            <p className="text-sm font-semibold">Latest Recall</p>
          </div>
          <div className="mt-4 space-y-2">
            {latestMemories.length > 0 ? (
              latestMemories.slice(0, 2).map((memory, index) => (
                <div
                  key={`${memory.createdAt}-${index}`}
                  className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em]",
                        memory.source === "note"
                          ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                          : "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
                      )}
                    >
                      {memory.source}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                      {formatMemoryDate(memory.createdAt)}
                    </span>
                  </div>
                  {memory.title && (
                    <div className="mt-2 text-sm font-medium text-white">
                      {memory.title}
                    </div>
                  )}
                  <div className="mt-1 text-[12px] leading-6 text-slate-400">
                    {formatMemoryPreview(memory.content, 120)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/8 bg-white/[0.02] px-3.5 py-4 text-sm leading-6 text-slate-500">
                No recalled memory yet. Ask about a past decision or note to
                light this panel up.
              </div>
            )}
          </div>
        </section>

        <section className="w-[84vw] max-w-[360px] snap-start rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-white">
            <Globe size={15} className="text-brand-cyan" />
            <p className="text-sm font-semibold">Research Deck</p>
          </div>
          <div className="mt-4 space-y-2">
            {latestSources.length > 0 ? (
              latestSources.slice(0, 2).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3 transition-all hover:border-brand-cyan/20 hover:bg-brand-cyan/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {source.title}
                      </div>
                      <div className="mt-1 text-[12px] leading-6 text-slate-500">
                        {source.snippet}
                      </div>
                    </div>
                    <div className="rounded-full border border-white/8 bg-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-slate-500">
                      {source.provider}
                    </div>
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/8 bg-white/[0.02] px-3.5 py-4 text-sm leading-6 text-slate-500">
                Web citations will appear here when the latest reply depends on
                current information.
              </div>
            )}
          </div>
        </section>

        <section className="w-[84vw] max-w-[360px] snap-start rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2 text-white">
            <Command size={15} className="text-fuchsia-300" />
            <p className="text-sm font-semibold">Shortcut Deck</p>
          </div>
          <div className="mt-4 space-y-2">
            {shortcutItems.map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-slate-300"
              >
                {item}
              </div>
            ))}
            {latestActionBadges.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {latestActionBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-fuchsia-400/18 bg-fuchsia-400/10 px-3 py-1 text-[11px] text-fuchsia-100"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );

  const quickLaneDock = (
    <div className="space-y-2 xl:hidden">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
        <Sparkles size={11} className="text-brand-cyan/70" />
        Quick Lanes
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:grid min-[430px]:grid-cols-2 min-[430px]:overflow-visible min-[430px]:pb-0">
        {PRIMARY_AI_COMMANDS.map(({ label, prompt, Icon, tone }) => (
          <button
            key={`quick-${label}`}
            onClick={() => prefillPrompt(prompt)}
            className={cn(
              "inline-flex min-h-[52px] min-w-[152px] items-center gap-2 rounded-[18px] border px-3 py-3 text-left text-sm font-medium transition-all hover:-translate-y-0.5 hover:border-white/16 min-[430px]:min-w-0",
              tone,
            )}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-white/80">
              <Icon size={15} />
            </span>
            <span className="leading-5 text-white">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const composer = (
    <div
      className={cn(
        "border-t border-white/7 bg-[linear-gradient(180deg,rgba(10,12,20,0.82),rgba(8,9,16,0.94))] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 xl:px-5",
        isPage && "sticky bottom-0 z-10 backdrop-blur-xl",
      )}
      style={
        isPage
          ? {
              paddingBottom:
                "max(0.9rem, calc(env(safe-area-inset-bottom) + 0.9rem))",
            }
          : undefined
      }
    >
      <div className="space-y-3">
        {pinnedPromptStrip}
        {quickLaneDock}

        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          <div className="flex items-center gap-2">
            <Command size={11} className="text-brand-cyan/70" />
            Keyboard Deck
          </div>
          <div className="hidden items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex">
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400">
              Ctrl/Cmd+K focus
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400">
              Ctrl/Cmd+Enter send
            </span>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400">
              Ctrl/Cmd+1-4 lanes
            </span>
          </div>
        </div>

        <div
          className={cn(
            "rounded-[22px] border bg-white/[0.03] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_18px_40px_rgba(0,0,0,0.18)] transition-all",
            composerFocused
              ? "border-brand-cyan/28 bg-brand-cyan/[0.04]"
              : "border-white/8",
          )}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onFocus={() => setComposerFocused(true)}
              onBlur={() => setComposerFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={
                isPage
                  ? "Ask Veritus AI to decide, recall, research, or act..."
                  : "Ask Veritus AI anything..."
              }
              className="min-h-[88px] w-full flex-1 resize-none bg-transparent text-sm leading-6 text-white placeholder:text-slate-500 focus:outline-none md:min-h-[24px]"
              rows={1}
            />

            <div className="flex items-center justify-end gap-2 sm:justify-start">
              <button
                onClick={() => togglePinnedPrompt(input)}
                disabled={!input.trim()}
                className={cn(
                  "inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-slate-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  draftIsPinned
                    ? "border-brand-cyan/24 bg-brand-cyan/10 text-brand-cyan"
                    : "border-white/8 bg-white/[0.03] hover:border-white/14 hover:text-white",
                )}
                aria-label={
                  draftIsPinned ? "Unpin draft preset" : "Pin draft preset"
                }
              >
                <Pin
                  size={14}
                  className={draftIsPinned ? "fill-current" : ""}
                />
              </button>

              <button
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple text-white shadow-[0_16px_34px_rgba(0,212,255,0.2)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 px-1 text-[10px] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <span>
            Enter to send, Shift+Enter for newline, Ctrl/Cmd+Shift+P to pin the
            draft.
          </span>
          <span className="hidden sm:inline">
            {isPage
              ? "Phase 2 automation + persistent memory + workspace actions"
              : "Tap a lane, refine the draft, then send"}
          </span>
        </div>
      </div>
    </div>
  );

  if (isPage) {
    return (
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,14,24,0.96),rgba(8,9,16,0.94))] shadow-[0_28px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:rounded-[32px]">
        <div className="pointer-events-none absolute inset-0 ai-grid-surface opacity-35" />
        <div className="pointer-events-none absolute -left-10 top-10 h-48 w-48 rounded-full bg-brand-cyan/10 blur-3xl ai-orb-drift-cyan" />
        <div className="pointer-events-none absolute bottom-10 right-6 h-52 w-52 rounded-full bg-brand-purple/10 blur-3xl ai-orb-drift-purple" />

        <div className="relative grid gap-3 p-3 sm:gap-4 sm:p-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,312px)] 2xl:grid-cols-[minmax(0,1fr)_336px]">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,18,34,0.94),rgba(9,11,22,0.92))] shadow-[0_18px_48px_rgba(0,0,0,0.24)] sm:rounded-[28px] xl:min-h-[780px]">
            <div className="border-b border-white/6 px-3.5 py-3.5 sm:px-5 sm:py-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                    Thread Stage
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-white sm:text-[22px]">
                    Run the conversation like an AI cockpit, not a plain chat
                    box.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Use the command deck to choose the type of reasoning you
                    want, then let the thread accumulate sources, memories, and
                    actions.
                  </p>
                </div>

                <div className="grid w-full grid-cols-2 gap-2 min-[430px]:grid-cols-4 xl:w-auto">
                  <button
                    onClick={() => void clearChat()}
                    className="col-span-2 inline-flex items-center justify-center gap-2 rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-[11px] text-slate-300 transition-colors hover:border-white/14 hover:bg-white/[0.05] hover:text-white min-[430px]:col-span-1"
                  >
                    <Trash2 size={12} />
                    Clear memory
                  </button>
                  {[
                    { label: "Session", value: String(sessionStats.messages) },
                    {
                      label: "Memory hits",
                      value: String(sessionStats.memories),
                    },
                    { label: "Actions", value: String(sessionStats.actions) },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2.5 text-center"
                    >
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                        {item.label}
                      </div>
                      <div className="mt-1 text-base font-semibold text-white">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:grid min-[430px]:grid-cols-2 min-[430px]:overflow-visible min-[430px]:pb-0 2xl:grid-cols-4">
                {PRIMARY_AI_COMMANDS.map(
                  ({ label, hint, description, prompt, Icon, tone }, index) => (
                    <button
                      key={label}
                      onClick={() => prefillPrompt(prompt)}
                      className={cn(
                        "group min-w-[260px] snap-start rounded-[18px] border p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/16 min-[430px]:min-w-0 sm:rounded-[20px]",
                        tone,
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                            {hint}
                          </div>
                          <div className="mt-2 text-base font-semibold text-white">
                            {label}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 px-2 py-1.5 text-[10px] text-slate-400">
                          {`Ctrl/Cmd+${index + 1}`}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-2 text-white/80 transition-transform group-hover:scale-105">
                          <Icon size={16} />
                        </div>
                        <div className="text-sm leading-6 text-slate-300">
                          {description}
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] leading-5 text-slate-500">
                        {prompt}
                      </div>
                    </button>
                  ),
                )}
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:flex-wrap min-[430px]:overflow-visible min-[430px]:pb-0">
                {SUGGESTION_ITEMS.slice(0, 6).map(({ text, Icon }) => (
                  <button
                    key={text}
                    onClick={() => handlePromptTrigger(text)}
                    className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300 transition-colors hover:border-brand-cyan/20 hover:bg-brand-cyan/10 hover:text-white min-[430px]:shrink min-[430px]:whitespace-normal"
                  >
                    <Icon size={11} className="text-brand-cyan/70" />
                    {text}
                  </button>
                ))}
              </div>

              {mobileIntelDeck}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5 [scrollbar-color:rgba(255,255,255,0.07)_transparent] [scrollbar-width:thin] sm:px-5 sm:py-4">
              {conversationThread}
            </div>

            {composer}
          </section>

          <aside className="hidden min-h-0 min-w-0 gap-4 xl:grid xl:overflow-y-auto xl:pr-1">
            <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2 text-white">
                <Bot size={15} className="text-brand-cyan" />
                <p className="text-sm font-semibold">Session Radar</p>
              </div>
              <div className="mt-4 grid gap-2">
                {radarItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[18px] border border-white/8 bg-black/20 px-3.5 py-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {item.value}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2 text-white">
                <FileText size={15} className="text-amber-300" />
                <p className="text-sm font-semibold">Latest Recall</p>
              </div>
              <div className="mt-4 space-y-2">
                {latestMemories.length > 0 ? (
                  latestMemories.map((memory, index) => (
                    <div
                      key={`${memory.createdAt}-${index}`}
                      className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em]",
                            memory.source === "note"
                              ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                              : "border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan",
                          )}
                        >
                          {memory.source}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                          {formatMemoryDate(memory.createdAt)}
                        </span>
                      </div>
                      {memory.title && (
                        <div className="mt-2 text-sm font-medium text-white">
                          {memory.title}
                        </div>
                      )}
                      <div className="mt-1 text-[12px] leading-6 text-slate-400">
                        {formatMemoryPreview(memory.content, 150)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-white/8 bg-white/[0.02] px-3.5 py-4 text-sm leading-6 text-slate-500">
                    No recalled memory on the latest turn yet. Ask about a past
                    decision or note to light this panel up.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2 text-white">
                <Globe size={15} className="text-brand-cyan" />
                <p className="text-sm font-semibold">Research Deck</p>
              </div>
              <div className="mt-4 space-y-2">
                {latestSources.length > 0 ? (
                  latestSources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3 transition-all hover:border-brand-cyan/20 hover:bg-brand-cyan/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {source.title}
                          </div>
                          <div className="mt-1 text-[12px] leading-6 text-slate-500">
                            {source.snippet}
                          </div>
                        </div>
                        <div className="rounded-full border border-white/8 bg-black/20 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-slate-500">
                          {source.provider}
                        </div>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-white/8 bg-white/[0.02] px-3.5 py-4 text-sm leading-6 text-slate-500">
                    Web citations will appear here when the latest reply depends
                    on current information.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
              <div className="flex items-center gap-2 text-white">
                <Command size={15} className="text-fuchsia-300" />
                <p className="text-sm font-semibold">Shortcut Deck</p>
              </div>
              <div className="mt-4 space-y-2">
                {shortcutItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3 text-sm leading-6 text-slate-300"
                  >
                    {item}
                  </div>
                ))}
                {latestActionBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {latestActionBadges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border border-fuchsia-400/18 bg-fuchsia-400/10 px-3 py-1 text-[11px] text-fuchsia-100"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {aiChatOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setAIChat(false)}
            aria-label="Close AI overlay"
          />

          <motion.div
            initial={{ y: "100%", opacity: 0.86 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="fixed inset-x-0 bottom-0 top-[max(0.65rem,env(safe-area-inset-top))] z-50 md:hidden"
          >
            <div className="relative flex h-full flex-col overflow-hidden rounded-t-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,14,24,0.98),rgba(8,9,16,0.96))] shadow-[0_-18px_60px_rgba(0,0,0,0.45)]">
              <div className="pointer-events-none absolute inset-0 ai-grid-surface opacity-40" />
              <div className="pointer-events-none absolute left-0 top-0 h-44 w-44 rounded-full bg-brand-cyan/12 blur-3xl ai-orb-drift-cyan" />
              <div className="pointer-events-none absolute bottom-6 right-0 h-52 w-52 rounded-full bg-brand-purple/12 blur-3xl ai-orb-drift-purple" />

              <div className="relative flex h-full flex-col">
                <div className="border-b border-white/6 px-4 pb-4 pt-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-brand-cyan">
                        <Bot size={11} />
                        Veritus AI
                      </div>
                      <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">
                        Mobile mission control.
                      </h2>
                      <p className="mt-2 text-[13px] leading-6 text-slate-400 sm:text-sm">
                        Pin the prompts you reuse, run the same command lanes,
                        and keep the full conversation live on your phone.
                      </p>
                    </div>

                    <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2 sm:w-auto sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px]">
                      <button
                        onClick={() => void clearChat()}
                        className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-3 text-[11px] text-slate-300"
                      >
                        <Trash2 size={11} />
                        Clear
                      </button>
                      <Link
                        href="/dashboard/ai"
                        onClick={() => setAIChat(false)}
                        className="inline-flex h-11 items-center justify-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-3 text-[11px] text-slate-300"
                      >
                        Full page
                        <ArrowUpRight size={11} />
                      </Link>
                      <button
                        onClick={() => setAIChat(false)}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300"
                        aria-label="Close AI overlay"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:grid min-[430px]:grid-cols-2 min-[430px]:overflow-visible min-[430px]:pb-0">
                    {PRIMARY_AI_COMMANDS.map(
                      ({ label, hint, prompt, Icon, tone }, index) => (
                        <button
                          key={label}
                          onClick={() => prefillPrompt(prompt)}
                          className={cn(
                            "min-w-[220px] snap-start rounded-[20px] border p-4 text-left transition-transform hover:-translate-y-0.5 min-[430px]:min-w-0",
                            tone,
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                {hint}
                              </div>
                              <div className="mt-2 text-base font-semibold text-white">
                                {label}
                              </div>
                            </div>
                            <div className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] text-slate-400">
                              {index + 1}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
                            <Icon size={15} />
                            <span className="line-clamp-2">{prompt}</span>
                          </div>
                        </button>
                      ),
                    )}
                  </div>

                  <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:flex-wrap min-[430px]:overflow-visible">
                    {SUGGESTION_ITEMS.slice(0, 6).map(({ text, Icon }) => (
                      <button
                        key={text}
                        onClick={() => handlePromptTrigger(text)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300"
                      >
                        <Icon size={11} className="text-brand-cyan/70" />
                        {text}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-color:rgba(255,255,255,0.07)_transparent] [scrollbar-width:thin]">
                  {conversationThread}
                </div>

                <div
                  className="pb-[max(1rem,env(safe-area-inset-bottom))]"
                  style={{
                    paddingBottom:
                      "max(1rem, calc(env(safe-area-inset-bottom) + 0.45rem))",
                  }}
                >
                  {composer}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
