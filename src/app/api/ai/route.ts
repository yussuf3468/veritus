import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIChatSchema } from "@/lib/validators";
import {
  chat,
  localChat,
  shouldUseLocalFastPath,
  type AIContext,
} from "@/lib/ai/openai";
import { checkRateLimit, resolveCurrencyCode } from "@/lib/utils";
import { format } from "date-fns";

type AIHistoryRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AINoteRow = {
  title: string;
  content: string;
  is_pinned: boolean;
  updated_at: string;
};

const MEMORY_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "what",
  "when",
  "where",
  "which",
  "would",
  "could",
  "should",
  "into",
  "about",
  "your",
  "my",
  "our",
  "their",
  "them",
  "they",
  "just",
  "been",
  "were",
  "then",
  "than",
  "there",
  "here",
  "also",
  "make",
  "made",
  "like",
  "want",
  "need",
  "plan",
]);

function normalizeMemoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeMemoryText(value: string) {
  return Array.from(
    new Set(
      normalizeMemoryText(value)
        .split(" ")
        .filter((token) => token.length > 2 && !MEMORY_STOPWORDS.has(token)),
    ),
  );
}

function getRecencyBoost(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;

  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 2) return 3;
  if (ageDays <= 7) return 2;
  if (ageDays <= 30) return 1;
  return 0;
}

function scoreMemoryCandidate({
  query,
  queryTokens,
  title,
  content,
  createdAt,
  pinned = false,
}: {
  query: string;
  queryTokens: string[];
  title?: string;
  content: string;
  createdAt: string;
  pinned?: boolean;
}) {
  const normalizedTitle = normalizeMemoryText(title ?? "");
  const normalizedContent = normalizeMemoryText(content);
  let score = 0;

  for (const token of queryTokens) {
    if (normalizedTitle.includes(token)) {
      score += 8;
      continue;
    }

    if (normalizedContent.includes(token)) {
      score += 3;
    }
  }

  if (
    /remember|earlier|before|last time|previous|what did we|did we|my notes|from my notes|based on my notes|continue/i.test(
      query,
    )
  ) {
    score += 2;
  }

  if (pinned) score += 2;

  return score + getRecencyBoost(createdAt);
}

function buildChatMemoryCandidates(
  historyRows: AIHistoryRow[],
  currentMessages: Array<{ role: "user" | "assistant"; content: string }>,
) {
  const seenCurrentMessages = new Set(
    currentMessages.map((message) => message.content.trim()),
  );
  const ordered = [...historyRows].sort((left, right) =>
    left.created_at.localeCompare(right.created_at),
  );
  const candidates: Array<NonNullable<AIContext["memories"]>[number]> = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const row = ordered[index];
    if (row.role !== "user") continue;
    if (seenCurrentMessages.has(row.content.trim())) continue;

    const next =
      ordered[index + 1]?.role === "assistant" ? ordered[index + 1] : null;
    candidates.push({
      source: "chat",
      content: next
        ? `User: ${row.content}\nAssistant: ${next.content}`
        : `User: ${row.content}`,
      createdAt: next?.created_at ?? row.created_at,
    });
  }

  return candidates;
}

function buildRetrievedMemories({
  latestUserMessage,
  currentMessages,
  notes,
  historyRows,
}: {
  latestUserMessage: string;
  currentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  notes: AINoteRow[];
  historyRows: AIHistoryRow[];
}) {
  const query = latestUserMessage.toLowerCase();
  const queryTokens = tokenizeMemoryText(latestUserMessage);
  const explicitRecall =
    /remember|earlier|before|last time|previous|what did we|did we|my notes|from my notes|based on my notes|continue/i.test(
      query,
    );

  const noteCandidates = notes.map((note) => ({
    source: "note" as const,
    title: note.title,
    content: `${note.title}\n${note.content}`,
    createdAt: note.updated_at,
    score: scoreMemoryCandidate({
      query,
      queryTokens,
      title: note.title,
      content: note.content,
      createdAt: note.updated_at,
      pinned: note.is_pinned,
    }),
  }));

  const chatCandidates = buildChatMemoryCandidates(
    historyRows,
    currentMessages,
  ).map((candidate) => ({
    ...candidate,
    score: scoreMemoryCandidate({
      query,
      queryTokens,
      content: candidate.content,
      createdAt: candidate.createdAt,
    }),
  }));

  const threshold = explicitRecall ? 1 : Math.max(3, queryTokens.length * 2);
  const scored = [...noteCandidates, ...chatCandidates]
    .filter((candidate) => candidate.score >= threshold)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ score: _score, ...memory }) => memory);

  if (scored.length > 0) {
    return scored;
  }

  if (!explicitRecall) {
    return [];
  }

  return [...noteCandidates, ...chatCandidates]
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(({ score: _score, ...memory }) => memory);
}

function mapStoredHistoryToMessages(rows: AIHistoryRow[]) {
  return rows
    .filter((row) => row.role === "user" || row.role === "assistant")
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      action:
        row.role === "assistant" &&
        row.metadata &&
        typeof row.metadata === "object"
          ? (row.metadata.action as { action?: string } & Record<
              string,
              unknown
            >)
          : undefined,
      sources:
        row.role === "assistant" &&
        row.metadata &&
        typeof row.metadata === "object" &&
        Array.isArray(row.metadata.sources)
          ? (row.metadata.sources as Array<{
              title: string;
              url: string;
              snippet: string;
              provider: string;
            }>)
          : undefined,
      memories:
        row.role === "assistant" &&
        row.metadata &&
        typeof row.metadata === "object" &&
        Array.isArray(row.metadata.memories)
          ? (row.metadata.memories as Array<{
              source: "chat" | "note";
              title?: string;
              content: string;
              createdAt: string;
            }>)
          : undefined,
    }));
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") ?? "24");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 40)
    : 24;

  const { data, error } = await supabase
    .from("ai_chat_history")
    .select("id,role,content,metadata,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: {
      messages: mapStoredHistoryToMessages(
        (data as AIHistoryRow[] | null) ?? [],
      ),
    },
  });
}

export async function DELETE() {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("ai_chat_history")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { cleared: true } });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 30 AI requests per minute per user
  if (!checkRateLimit(`ai_${user.id}`, 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parse = AIChatSchema.safeParse(body);
  if (!parse.success)
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });

  // Build context for AI
  const today = format(new Date(), "yyyy-MM-dd");
  const [tasks, txs, habits, completions, goals, notes, historyRows, profile] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,status,priority,due_date,is_focus,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("type,amount,category,description,date")
        .eq("user_id", user.id)
        .gte("date", `${today.slice(0, 7)}-01`)
        .order("date", { ascending: false }),
      supabase
        .from("habits")
        .select("id,name,streak")
        .eq("user_id", user.id)
        .order("streak", { ascending: false }),
      supabase
        .from("habit_completions")
        .select("habit_id")
        .eq("user_id", user.id)
        .eq("completed_date", today),
      supabase
        .from("goals")
        .select("id,title,progress,deadline,category,status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("updated_at", { ascending: false }),
      supabase
        .from("notes")
        .select("title,content,is_pinned,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(16),
      supabase
        .from("ai_chat_history")
        .select("id,role,content,metadata,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("user_profiles")
        .select("currency,full_name")
        .eq("id", user.id)
        .single(),
    ]);

  const taskRows = tasks.data ?? [];
  const monthTransactions = txs.data ?? [];
  const activeGoals = goals.data ?? [];
  const habitRows = habits.data ?? [];
  const noteRows = (notes.data as AINoteRow[] | null) ?? [];
  const storedHistoryRows = (historyRows.data as AIHistoryRow[] | null) ?? [];
  const latestUserMessage = parse.data.messages.at(-1)?.content ?? "";

  const ctx: AIContext = {
    profile: {
      name:
        profile.data?.full_name?.trim() ||
        (typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name.trim()
          : undefined),
    },
    today: format(new Date(), "EEEE, MMMM d, yyyy"),
    tasks: {
      pending: taskRows.filter((task) => task.status === "pending").length,
      urgent: taskRows.filter((task) => task.priority === "urgent").length,
      inProgress: taskRows.filter((task) => task.status === "in_progress")
        .length,
      focus: taskRows.filter(
        (task) =>
          task.is_focus &&
          task.status !== "completed" &&
          task.status !== "cancelled",
      ).length,
      overdue: taskRows.filter(
        (task) =>
          task.due_date &&
          task.due_date < today &&
          task.status !== "completed" &&
          task.status !== "cancelled",
      ).length,
      recent: taskRows.slice(0, 8).map((task) => ({
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.due_date,
        isFocus: task.is_focus,
      })),
    },
    money: {
      balance: monthTransactions.reduce(
        (a, t) =>
          t.type === "income" ? a + Number(t.amount) : a - Number(t.amount),
        0,
      ),
      currency: resolveCurrencyCode(profile.data?.currency),
      income: monthTransactions
        .filter((tx) => tx.type === "income")
        .reduce((sum, tx) => sum + Number(tx.amount), 0),
      expense: monthTransactions
        .filter((tx) => tx.type === "expense")
        .reduce((sum, tx) => sum + Number(tx.amount), 0),
      recent: monthTransactions.slice(0, 6).map((tx) => ({
        type: tx.type,
        amount: Number(tx.amount),
        category: tx.category,
        description: tx.description,
        date: tx.date,
      })),
    },
    habits: {
      total: habitRows.length,
      completedToday: (completions.data ?? []).length,
      streaking: habitRows.slice(0, 5).map((habit) => ({
        name: habit.name,
        streak: habit.streak,
      })),
    },
    goals: {
      active: activeGoals.length,
      recent: activeGoals.slice(0, 5).map((goal) => ({
        title: goal.title,
        progress: Number(goal.progress ?? 0),
        deadline: goal.deadline,
        category: goal.category,
      })),
    },
    memories: buildRetrievedMemories({
      latestUserMessage,
      currentMessages: parse.data.messages,
      notes: noteRows,
      historyRows: storedHistoryRows,
    }),
    recentNotes: noteRows.slice(0, 6).map((note) => {
      const preview = String(note.content ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 110);
      return `${note.is_pinned ? "Pinned: " : ""}${note.title}${preview ? ` — ${preview}` : ""}`;
    }),
  };

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const hasConfiguredModelProvider = Boolean(
    openAiKey && openAiKey !== "your-openai-api-key",
  );
  const useLocalFastPath = shouldUseLocalFastPath(parse.data.messages);

  let aiResponse: Awaited<ReturnType<typeof chat>>;
  try {
    aiResponse =
      !hasConfiguredModelProvider || useLocalFastPath
        ? await localChat(parse.data.messages, ctx)
        : await chat(parse.data.messages, ctx);
  } catch {
    aiResponse = await localChat(parse.data.messages, ctx);
  }

  let { content, action, sources } = aiResponse;
  const memories = ctx.memories?.slice(0, 3) ?? [];

  const lastUserMsg = parse.data.messages.at(-1);
  const persistHistory = (async () => {
    await supabase.from("ai_chat_history").insert([
      { user_id: user.id, role: "user", content: lastUserMsg?.content ?? "" },
      {
        user_id: user.id,
        role: "assistant",
        content,
        metadata:
          action || (sources?.length ?? 0) > 0 || memories.length > 0
            ? { action, sources, memories }
            : null,
      },
    ]);
  })();

  // Execute action if AI returned one
  let actionResult: unknown = null;
  let actionError: string | null = null;
  if (action?.action) {
    const [result] = await Promise.all([
      executeAction(supabase, user.id, action),
      persistHistory.catch(() => null),
    ]);
    actionResult = result;
    if (!actionResult) {
      actionError = "I understood that request, but I could not save it.";
      content = `${content} ${actionError}`.trim();
    }
  } else {
    void persistHistory.catch(() => null);
  }

  return NextResponse.json({
    data: { content, action, actionResult, actionError, sources, memories },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeAction(
  supabase: any,
  userId: string,
  action: Record<string, unknown>,
) {
  try {
    switch (action.action) {
      case "add_task":
        return (
          await supabase
            .from("tasks")
            .insert({
              user_id: userId,
              title: action.title,
              priority: action.priority ?? "medium",
              due_date: action.due_date ?? null,
              ai_suggested: true,
            })
            .select()
            .single()
        ).data;

      case "log_expense":
        return (
          await supabase
            .from("transactions")
            .insert({
              user_id: userId,
              type: "expense",
              amount: action.amount,
              category: action.category ?? "Other",
              description: action.description ?? null,
            })
            .select()
            .single()
        ).data;

      case "log_income":
        return (
          await supabase
            .from("transactions")
            .insert({
              user_id: userId,
              type: "income",
              amount: action.amount,
              category: action.category ?? "Other",
              description: action.description ?? null,
            })
            .select()
            .single()
        ).data;

      case "add_habit":
        return (
          await supabase
            .from("habits")
            .insert({
              user_id: userId,
              name: action.name,
              description: action.description ?? null,
            })
            .select()
            .single()
        ).data;

      case "add_goal":
        return (
          await supabase
            .from("goals")
            .insert({
              user_id: userId,
              title: action.title,
              type: action.type ?? "short_term",
              deadline: action.deadline ?? null,
              ai_suggested: true,
            })
            .select()
            .single()
        ).data;

      case "add_note":
        return (
          await supabase
            .from("notes")
            .insert({
              user_id: userId,
              title: action.title,
              content: action.content ?? "",
            })
            .select()
            .single()
        ).data;

      default:
        return null;
    }
  } catch {
    return null;
  }
}
