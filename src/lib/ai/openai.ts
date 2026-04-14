import OpenAI from "openai";
import { formatCurrency, resolveCurrencyCode } from "@/lib/utils";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const MAX_MODEL_TOKENS = 820;
const HAS_MODEL_PROVIDER = Boolean(
  OPENAI_API_KEY && OPENAI_API_KEY !== "your-openai-api-key",
);

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIContext {
  profile?: { name?: string };
  today?: string;
  tasks?: {
    pending: number;
    urgent: number;
    inProgress?: number;
    focus?: number;
    overdue?: number;
    recent?: Array<{
      title: string;
      priority: string;
      status: string;
      dueDate?: string | null;
      isFocus?: boolean;
    }>;
  };
  money?: {
    balance: number;
    currency: string;
    income?: number;
    expense?: number;
    recent?: Array<{
      type: "income" | "expense";
      amount: number;
      category: string;
      description?: string | null;
      date: string;
    }>;
  };
  habits?: {
    total: number;
    completedToday: number;
    streaking?: Array<{ name: string; streak: number }>;
  };
  goals?: {
    active: number;
    recent?: Array<{
      title: string;
      progress: number;
      deadline?: string | null;
      category?: string | null;
    }>;
  };
  memories?: Array<{
    source: "chat" | "note";
    title?: string;
    content: string;
    createdAt: string;
  }>;
  recentNotes?: string[];
}

type AITaskContextItem = NonNullable<
  NonNullable<AIContext["tasks"]>["recent"]
>[number];

type AIMoneyContextItem = NonNullable<
  NonNullable<AIContext["money"]>["recent"]
>[number];

type AIMemoryContextItem = NonNullable<AIContext["memories"]>[number];

export interface AISource {
  title: string;
  url: string;
  snippet: string;
  provider: string;
}

interface AIChatResult {
  content: string;
  action?: Record<string, unknown>;
  sources?: AISource[];
}

interface DuckDuckGoTopic {
  Text?: string;
  FirstURL?: string;
  Topics?: DuckDuckGoTopic[];
}

interface DuckDuckGoResponse {
  Heading?: string;
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: DuckDuckGoTopic[];
}

interface WikipediaSearchItem {
  title?: string;
  snippet?: string;
}

interface WikipediaSearchResponse {
  query?: {
    search?: WikipediaSearchItem[];
  };
}

function getOpenAIClient() {
  if (!HAS_MODEL_PROVIDER || !OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });
}

function extractAction(content: string): Record<string, unknown> | undefined {
  const candidates = [
    content.match(/```json\s*([\s\S]*?)```/i)?.[1],
    content.match(/\{[\s\S]*?"action"[\s\S]*?\}/)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (
        parsed &&
        typeof parsed === "object" &&
        "action" in parsed &&
        typeof parsed.action === "string"
      ) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore invalid JSON blocks and continue.
    }
  }

  return undefined;
}

function stripActionBlock(content: string) {
  return content
    .replace(/```json\s*[\s\S]*?```/gi, "")
    .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLatestUserMessage(messages: AIMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")
    ?.content;
}

function parsePriority(message: string): "low" | "medium" | "high" | "urgent" {
  if (/\burgent\b/i.test(message)) return "urgent";
  if (/\bhigh\b/i.test(message)) return "high";
  if (/\blow\b/i.test(message)) return "low";
  return "medium";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanEntity(value?: string | null) {
  if (!value) return undefined;

  const cleaned = normalizeWhitespace(
    value
      .replace(/^[\s,:-]+/, "")
      .replace(
        /\b(?:today|yesterday|tonight|this morning|this afternoon|this evening|last night)\b.*$/i,
        "",
      )
      .replace(/[.!?]+$/, "")
      .replace(/^(?:my|a|an|the)\s+/i, ""),
  );

  return cleaned || undefined;
}

function toAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/,/g, ""))
        : Number.NaN;

  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function parseMoneyAmount(message: string) {
  const match = message.match(
    /(?:\b(?:ksh|kes|shillings?)\b\s*)?\$?\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\s*\b(?:ksh|kes|shillings?)\b)?/i,
  );
  return toAmount(match?.[1]);
}

function formatMoneyAmount(amount: number, currency = "KES") {
  return formatCurrency(amount, resolveCurrencyCode(currency));
}

function inferIncomeCategory(message: string, source?: string) {
  const text = `${message} ${source ?? ""}`.toLowerCase();

  if (/salary|paycheck|wage|pay day/.test(text)) return "Salary";
  if (/freelance|client|project|contract|invoice/.test(text)) {
    return "Freelance";
  }
  if (/invest|dividend|interest|stock|crypto/.test(text)) {
    return "Investment";
  }
  if (
    /gift|friend|bonus|tip|refund|cashback|allowance|mom|dad|brother|sister/.test(
      text,
    )
  ) {
    return "Gift";
  }

  return "Other";
}

function inferExpenseCategory(message: string, target?: string) {
  const text = `${message} ${target ?? ""}`.toLowerCase();

  if (
    /food|grocer|lunch|dinner|breakfast|coffee|restaurant|meal|snack/.test(text)
  ) {
    return "Food";
  }
  if (/transport|uber|taxi|fuel|gas|bus|train|parking|flight/.test(text)) {
    return "Transport";
  }
  if (/housing|rent|mortgage|apartment|house/.test(text)) {
    return "Housing";
  }
  if (/health|doctor|medicine|pharmacy|hospital|gym/.test(text)) {
    return "Health";
  }
  if (/entertainment|movie|game|concert|netflix|spotify/.test(text)) {
    return "Entertainment";
  }
  if (/shopping|clothes|amazon|mall|store/.test(text)) {
    return "Shopping";
  }
  if (/education|course|book|tuition|school/.test(text)) {
    return "Education";
  }
  if (/utilities|electric|water|internet|wifi|phone bill/.test(text)) {
    return "Utilities";
  }

  return "Other";
}

function buildTransactionDescription(message: string, fallback?: string) {
  const normalized = normalizeWhitespace(message);
  if (fallback) return fallback;
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177).trimEnd()}...`;
}

const TASK_PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const TASK_STATUS_ORDER: Record<string, number> = {
  in_progress: 0,
  pending: 1,
  completed: 2,
  cancelled: 3,
};

function pickPriorityTask(tasks: AITaskContextItem[] = []) {
  return (
    [...tasks].sort((left, right) => {
      if (Boolean(left.isFocus) !== Boolean(right.isFocus)) {
        return left.isFocus ? -1 : 1;
      }

      const priorityGap =
        (TASK_PRIORITY_ORDER[left.priority] ?? 4) -
        (TASK_PRIORITY_ORDER[right.priority] ?? 4);
      if (priorityGap !== 0) return priorityGap;

      const statusGap =
        (TASK_STATUS_ORDER[left.status] ?? 4) -
        (TASK_STATUS_ORDER[right.status] ?? 4);
      if (statusGap !== 0) return statusGap;

      if (left.dueDate && right.dueDate) {
        return left.dueDate.localeCompare(right.dueDate);
      }

      if (left.dueDate) return -1;
      if (right.dueDate) return 1;
      return left.title.localeCompare(right.title);
    })[0] ?? null
  );
}

function pickLargestExpense(recent: AIMoneyContextItem[] = []) {
  return (
    [...recent]
      .filter((entry) => entry.type === "expense")
      .sort((left, right) => right.amount - left.amount)[0] ?? null
  );
}

function describeTask(task: AITaskContextItem) {
  const pieces = [task.title];
  if (task.priority && task.priority !== "medium") {
    pieces.push(`${task.priority} priority`);
  }
  if (task.dueDate) {
    pieces.push(`due ${task.dueDate}`);
  }
  if (task.isFocus) {
    pieces.push("in focus lane");
  }
  return pieces.join(", ");
}

function clipMemory(memory: AIMemoryContextItem, limit = 180) {
  const normalized = normalizeWhitespace(memory.content);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3).trimEnd()}...`;
}

function buildMemoryRecallReply(ctx: AIContext) {
  if (!ctx.memories?.length) {
    return "I do not have a strong match from past chats or notes for that yet. Name the topic, decision, or note more specifically and I can pull it back in.";
  }

  const [primary, secondary] = ctx.memories;
  const firstLine =
    primary.source === "note"
      ? `The closest note memory is **${primary.title ?? "untitled note"}**: ${clipMemory(primary)}.`
      : `The closest past conversation memory is: ${clipMemory(primary)}.`;

  const secondLine = secondary
    ? secondary.source === "note"
      ? `Another relevant note is **${secondary.title ?? "untitled note"}**: ${clipMemory(secondary, 140)}.`
      : `Another relevant chat memory is: ${clipMemory(secondary, 140)}.`
    : null;

  return [firstLine, secondLine].filter(Boolean).join(" ");
}

function extractIncomeSource(message: string) {
  const fromMatch = message.match(/\bfrom\s+(.+?)(?:[,.!?]|$)/i)?.[1];
  if (fromMatch) return cleanEntity(fromMatch);

  const paidMeMatch = message.match(
    /\b([a-z][a-z\s'.-]{1,48}?)\s+(?:gave|paid)\s+me\b/i,
  )?.[1];
  return cleanEntity(paidMeMatch);
}

function extractExpenseTarget(message: string) {
  const directMatch = message.match(
    /\b(?:for|on|at|to)\s+(.+?)(?:[,.!?]|$)/i,
  )?.[1];
  if (directMatch) return cleanEntity(directMatch);

  const purchaseMatch = message.match(
    /\b(?:bought|purchased)\s+(.+?)\s+for\s+(?:(?:ksh|kes|shillings?)\s*)?\$?\d[\d,]*(?:\.\d{1,2})?/i,
  )?.[1];
  return cleanEntity(purchaseMatch);
}

function createIncomeAction(
  amount: number,
  message: string,
  options: { source?: string; description?: string } = {},
) {
  const source = cleanEntity(options.source);
  const description =
    cleanEntity(options.description) ??
    buildTransactionDescription(message, source ? `From ${source}` : undefined);

  return {
    action: "log_income",
    amount,
    category: inferIncomeCategory(message, source),
    description,
    source: source ?? null,
  };
}

function createExpenseAction(
  amount: number,
  message: string,
  options: { target?: string; description?: string } = {},
) {
  const target = cleanEntity(options.target);
  const description =
    cleanEntity(options.description) ??
    buildTransactionDescription(message, target ? `For ${target}` : undefined);

  return {
    action: "log_expense",
    amount,
    category: inferExpenseCategory(message, target),
    description,
    target: target ?? null,
  };
}

function buildSummaryReply(ctx: AIContext) {
  const lines = ["Here is your current snapshot:"];
  const primaryTask = pickPriorityTask(ctx.tasks?.recent);
  const topGoal = ctx.goals?.recent?.[0];
  const largestExpense = pickLargestExpense(ctx.money?.recent);

  if (ctx.tasks) {
    lines.push(
      `You have ${ctx.tasks.pending} pending task${ctx.tasks.pending === 1 ? "" : "s"}${ctx.tasks.urgent > 0 ? `, including ${ctx.tasks.urgent} urgent` : ""}${ctx.tasks.inProgress ? `, and ${ctx.tasks.inProgress} already in progress` : ""}.`,
    );
  }

  if (primaryTask) {
    lines.push(
      `The sharpest task to move next is **${describeTask(primaryTask)}**.`,
    );
  }

  if (ctx.habits) {
    lines.push(
      `Habits are at ${ctx.habits.completedToday}/${ctx.habits.total} completed today.`,
    );
  }

  if (ctx.goals) {
    lines.push(`You are tracking ${ctx.goals.active} active goals.`);
  }

  if (topGoal) {
    lines.push(
      `The goal with the clearest momentum is **${topGoal.title}** at ${topGoal.progress}% progress.`,
    );
  }

  if (ctx.money) {
    lines.push(
      `Your current monthly balance is ${formatMoneyAmount(ctx.money.balance, ctx.money.currency)}.`,
    );
  }

  if (largestExpense) {
    lines.push(
      `Your biggest recent expense was ${formatMoneyAmount(largestExpense.amount, ctx.money?.currency ?? "KES")} in ${largestExpense.category}.`,
    );
  }

  if (ctx.recentNotes?.length) {
    lines.push(`Recent note context: ${ctx.recentNotes[0]}.`);
  }

  lines.push(
    primaryTask
      ? `Start with **${primaryTask.title}**, then close one small follow-through item before opening anything new.`
      : "Start with the urgent task, then close one easy win to build momentum.",
  );

  return lines.join(" ");
}

function buildFocusReply(ctx: AIContext) {
  const priorityTask = pickPriorityTask(ctx.tasks?.recent);
  const secondaryTask = ctx.tasks?.recent?.find(
    (task) => task.title !== priorityTask?.title && task.status !== "completed",
  );

  if (priorityTask) {
    return `Start with **${priorityTask.title}**${priorityTask.dueDate ? ` because it is due ${priorityTask.dueDate}` : " because it carries the best leverage"}. Work until it is materially advanced or finished, then move to ${secondaryTask ? `**${secondaryTask.title}**` : "the next smallest follow-through task"}.`;
  }

  if (ctx.tasks?.urgent) {
    return `Your first move should be clearing the ${ctx.tasks.urgent} urgent task${ctx.tasks.urgent === 1 ? "" : "s"}. After that, pick one pending item that reduces tomorrow's load.`;
  }

  if ((ctx.tasks?.pending ?? 0) > 0) {
    return `You do not have urgent tasks right now. Pick one high-leverage pending task, then use the rest of the session to finish a second smaller item.`;
  }

  if (
    (ctx.habits?.total ?? 0) > 0 &&
    (ctx.habits?.completedToday ?? 0) < (ctx.habits?.total ?? 0)
  ) {
    return "Your task list looks light, so the best focus is habit completion. Knock out the remaining daily habits while your momentum is clean.";
  }

  return "Your board looks relatively calm. Use this window for planning, reflection, or setting one concrete goal for the next session.";
}

function buildPlanningReply(ctx: AIContext) {
  const steps: string[] = [];
  const priorityTask = pickPriorityTask(ctx.tasks?.recent);
  const remainingHabits = Math.max(
    (ctx.habits?.total ?? 0) - (ctx.habits?.completedToday ?? 0),
    0,
  );
  const topGoal = ctx.goals?.recent?.[0];

  if (priorityTask) {
    steps.push(
      `1. Start with **${priorityTask.title}**${priorityTask.dueDate ? ` before ${priorityTask.dueDate}` : ""} and stay on it until it is clearly moved forward.`,
    );
  }

  if (remainingHabits > 0) {
    steps.push(
      `2. Finish the remaining ${remainingHabits} habit${remainingHabits === 1 ? "" : "s"} while momentum is already active.`,
    );
  }

  if (topGoal) {
    steps.push(
      `3. Spend one focused block advancing **${topGoal.title}** instead of letting goals become background noise.`,
    );
  }

  if ((ctx.money?.balance ?? 0) < 0) {
    steps.push(
      "4. Review spending before any non-essential purchase so the rest of the week does not drift.",
    );
  }

  if (steps.length === 0) {
    return "Your system is fairly open right now. Set one clear task, one small habit block, and one next move on a goal so the day has shape.";
  }

  return ["Here is a clean plan for today:", ...steps].join("\n");
}

function buildMoneyReply(ctx: AIContext) {
  if (!ctx.money) {
    return "I do not have money context yet. Try logging a few transactions and I can summarize your spending pattern.";
  }

  const biggestExpense = pickLargestExpense(ctx.money.recent);

  if (ctx.money.balance >= 0) {
    return `You are net positive this month at ${formatMoneyAmount(ctx.money.balance, ctx.money.currency)}.${biggestExpense ? ` Your largest recent expense was ${formatMoneyAmount(biggestExpense.amount, ctx.money.currency)} in ${biggestExpense.category}.` : ""} Keep discretionary spending tight and direct the surplus toward a goal or savings bucket.`;
  }

  return `You are currently negative by ${formatMoneyAmount(Math.abs(ctx.money.balance), ctx.money.currency)} this month.${biggestExpense ? ` The clearest expense to review is ${biggestExpense.category} at ${formatMoneyAmount(biggestExpense.amount, ctx.money.currency)}.` : ""} Cut one low-value expense category this week and avoid adding new recurring costs.`;
}

function buildAdviceReply(message: string, ctx: AIContext) {
  const normalized = message.toLowerCase();

  if (/money|budget|spend|save|expense|income|finance/.test(normalized)) {
    return buildMoneyReply(ctx);
  }

  if (/focus|priorit|next|plan|productive|task/.test(normalized)) {
    return buildFocusReply(ctx);
  }

  const lines = [
    "Here is the practical way to approach it:",
    "Define the exact outcome you want before choosing a tactic.",
    "List the main constraint, then pick the smallest next step that reduces uncertainty.",
  ];

  if (ctx.tasks?.urgent) {
    lines.push(
      `Do not ignore your ${ctx.tasks.urgent} urgent task${ctx.tasks.urgent === 1 ? "" : "s"} while deciding; clear that pressure first.`,
    );
  }

  if (ctx.memories?.length) {
    lines.push(`Relevant past context: ${clipMemory(ctx.memories[0], 120)}.`);
  }

  lines.push("If you want, I can turn that into a concrete plan or checklist.");
  return lines.join(" ");
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function flattenDuckDuckGoTopics(
  topics: DuckDuckGoTopic[] = [],
): DuckDuckGoTopic[] {
  return topics.flatMap((topic) =>
    Array.isArray(topic.Topics) && topic.Topics.length > 0
      ? flattenDuckDuckGoTopics(topic.Topics)
      : [topic],
  );
}

function dedupeSources(sources: AISource[]) {
  const seen = new Set<string>();

  return sources.filter((source) => {
    if (!source.url || seen.has(source.url)) {
      return false;
    }

    seen.add(source.url);
    return true;
  });
}

function cleanWebQuery(message: string) {
  return normalizeWhitespace(
    message
      .replace(/^(?:can you|could you|would you|please)\s+/i, "")
      .replace(
        /^(?:search(?: the)?(?: web| internet| online)?|look ?up|lookup|research|google|browse|find(?: information| info)?(?: on| about)?|what's the latest on|what is the latest on)\s*/i,
        "",
      )
      .replace(/\b(?:for me|on the internet|on the web|online)\b/gi, "")
      .replace(/[?]+$/, ""),
  );
}

function needsWebLookup(message: string) {
  const normalized = message.toLowerCase();
  if (!normalized) return false;

  if (
    /\b(search(?: the)?(?: web| internet| online)?|look ?up|lookup|research|google|browse|find(?: information| info)?(?: on| about)?)\b/.test(
      normalized,
    )
  ) {
    return true;
  }

  return /\b(latest|current|today|news|recent|this week|this month|live)\b/.test(
    normalized,
  );
}

async function searchDuckDuckGo(query: string): Promise<AISource[]> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&no_redirect=1&skip_disambig=1`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "VeritusAI/1.0",
        },
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as DuckDuckGoResponse;
    const sources: AISource[] = [];

    if (data.AbstractText && data.AbstractURL) {
      sources.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.AbstractText,
        provider: "DuckDuckGo",
      });
    }

    for (const topic of flattenDuckDuckGoTopics(data.RelatedTopics).slice(
      0,
      3,
    )) {
      if (!topic.FirstURL || !topic.Text) continue;
      sources.push({
        title: stripHtmlTags(topic.Text).split(" - ")[0] || query,
        url: topic.FirstURL,
        snippet: stripHtmlTags(topic.Text),
        provider: "DuckDuckGo",
      });
    }

    return sources;
  } catch {
    return [];
  }
}

async function searchWikipedia(query: string): Promise<AISource[]> {
  try {
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&srlimit=3`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "VeritusAI/1.0",
        },
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as WikipediaSearchResponse;
    const items = data.query?.search ?? [];

    return items.slice(0, 3).flatMap((item) => {
      const title = item.title?.trim();
      if (!title) return [];

      return [
        {
          title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`,
          snippet: stripHtmlTags(item.snippet ?? ""),
          provider: "Wikipedia",
        },
      ];
    });
  } catch {
    return [];
  }
}

async function lookupWeb(message: string): Promise<AISource[]> {
  if (!message || inferAction(message) || !needsWebLookup(message)) {
    return [];
  }

  const query = cleanWebQuery(message);
  if (!query) return [];

  const [duckDuckGoSources, wikipediaSources] = await Promise.all([
    searchDuckDuckGo(query),
    searchWikipedia(query),
  ]);

  return dedupeSources([...duckDuckGoSources, ...wikipediaSources]).slice(0, 4);
}

function buildWebReply(query: string, sources: AISource[]) {
  if (sources.length === 0) {
    return "I could not pull useful web results for that yet. Try a more specific query with names, dates, or the word latest.";
  }

  const [primary, ...rest] = sources;
  const lead =
    primary.snippet || `I found a relevant result from ${primary.provider}.`;
  const followUp =
    rest.length > 0
      ? ` I also found ${rest
          .slice(0, 2)
          .map((source) => source.title)
          .join(" and ")} for follow-up reading.`
      : "";

  return `I looked up "${cleanWebQuery(query) || query}". ${lead}${followUp} Open the sources below if you want the original pages.`;
}

function buildWebResearchPrompt(query: string, sources: AISource[]) {
  if (sources.length === 0) return "";

  return `Current web research for the user query "${query}":\n${sources
    .map(
      (source, index) =>
        `${index + 1}. ${source.title}\nProvider: ${source.provider}\nURL: ${source.url}\nSnippet: ${source.snippet || "No snippet provided."}`,
    )
    .join(
      "\n\n",
    )}\n\nUse these results when answering. If the question depends on current or factual web information, ground the answer in these sources and do not invent details beyond them.`;
}

function inferAction(message: string): Record<string, unknown> | undefined {
  const normalized = normalizeWhitespace(message);

  const taskMatch =
    normalized.match(/(?:^|\b)(?:add|create)\s+task[:\s-]+(.+)/i) ??
    normalized.match(/^task[:\s-]+(.+)/i);
  if (taskMatch?.[1]) {
    return {
      action: "add_task",
      title: taskMatch[1].trim(),
      priority: parsePriority(normalized),
    };
  }

  const habitMatch = normalized.match(
    /(?:^|\b)(?:add|create)\s+habit[:\s-]+(.+)/i,
  );
  if (habitMatch?.[1]) {
    return {
      action: "add_habit",
      name: habitMatch[1].trim(),
    };
  }

  const goalMatch = normalized.match(
    /(?:^|\b)(?:add|create|set)\s+goal[:\s-]+(.+)/i,
  );
  if (goalMatch?.[1]) {
    return {
      action: "add_goal",
      title: goalMatch[1].trim(),
      type: /long/i.test(normalized) ? "long_term" : "short_term",
    };
  }

  const noteMatch = normalized.match(
    /(?:^|\b)(?:add|create|save)\s+note[:\s-]+(.+)/i,
  );
  if (noteMatch?.[1]) {
    return {
      action: "add_note",
      title: noteMatch[1].trim().slice(0, 60),
      content: noteMatch[1].trim(),
    };
  }

  const explicitExpenseMatch = normalized.match(
    /(?:add|log)\s+(?:an?\s+)?expense(?:\s+of)?\s*(?:(?:ksh|kes|shillings?)\s*)?\$?(\d+(?:\.\d{1,2})?)(?:\s*(?:ksh|kes|shillings?))?(?:\s+(?:for|on|in)\s+([a-zA-Z ]+))?(?:\s*[:-]\s*(.+))?/i,
  );
  if (explicitExpenseMatch) {
    return createExpenseAction(Number(explicitExpenseMatch[1]), normalized, {
      target: explicitExpenseMatch[2],
      description: explicitExpenseMatch[3],
    });
  }

  const explicitIncomeMatch = normalized.match(
    /(?:add|log)\s+(?:an?\s+)?income(?:\s+of)?\s*(?:(?:ksh|kes|shillings?)\s*)?\$?(\d+(?:\.\d{1,2})?)(?:\s*(?:ksh|kes|shillings?))?(?:\s+(?:for|from|in)\s+([a-zA-Z ]+))?(?:\s*[:-]\s*(.+))?/i,
  );
  if (explicitIncomeMatch) {
    return createIncomeAction(Number(explicitIncomeMatch[1]), normalized, {
      source: explicitIncomeMatch[2],
      description: explicitIncomeMatch[3],
    });
  }

  const amount = parseMoneyAmount(normalized);
  const incomeVerbMatch =
    /\b(?:got|received|earned|made|won|collected|sold|got paid|was paid|paid me|gave me|refunded|reimbursed)\b/i.test(
      normalized,
    ) || /\b(?:salary|paycheck|bonus|tip|cashback)\b/i.test(normalized);
  const expenseVerbMatch =
    /\b(?:spent|paid|bought|purchased|cost me|used|sent)\b/i.test(normalized) ||
    /\b(?:expense|bill|rent|fare)\b/i.test(normalized);

  if (amount && expenseVerbMatch && !incomeVerbMatch) {
    return createExpenseAction(amount, normalized, {
      target: extractExpenseTarget(normalized),
    });
  }

  if (amount && incomeVerbMatch) {
    return createIncomeAction(amount, normalized, {
      source: extractIncomeSource(normalized),
    });
  }

  return undefined;
}

export function shouldUseLocalFastPath(messages: AIMessage[]) {
  const latestUserMessage = getLatestUserMessage(messages)?.trim() ?? "";
  if (!latestUserMessage) return true;

  return Boolean(inferAction(latestUserMessage));
}

function buildActionReply(action: Record<string, unknown>, currency = "KES") {
  switch (action.action) {
    case "add_task":
      return `Adding **${String(action.title ?? "Untitled task")}** to your task list now.`;
    case "log_expense": {
      const amount = toAmount(action.amount);
      const target = cleanEntity(
        typeof action.target === "string"
          ? action.target
          : typeof action.category === "string"
            ? action.category
            : undefined,
      );

      return `Logged ${amount ? formatMoneyAmount(amount, currency) : "that amount"} as an expense${target ? ` for ${target}` : ""}.`;
    }
    case "log_income": {
      const amount = toAmount(action.amount);
      const source = cleanEntity(
        typeof action.source === "string"
          ? action.source
          : typeof action.category === "string"
            ? action.category
            : undefined,
      );

      return `Logged ${amount ? formatMoneyAmount(amount, currency) : "that amount"} as income${source ? ` from ${source}` : ""}.`;
    }
    case "add_habit":
      return `Adding **${String(action.name ?? "New habit")}** to your habit tracker now.`;
    case "add_goal":
      return `Creating **${String(action.title ?? "New goal")}** and attaching it to your goals workspace.`;
    case "add_note":
      return `Saving that note now so it is available in your notes workspace.`;
    default:
      return "I am applying that update now.";
  }
}

export async function localChat(
  messages: AIMessage[],
  ctx: AIContext,
  options: { sources?: AISource[] } = {},
): Promise<AIChatResult> {
  const latestUserMessage = getLatestUserMessage(messages)?.trim() ?? "";
  const action = inferAction(latestUserMessage);

  if (action) {
    return {
      content: buildActionReply(action, ctx.money?.currency ?? "KES"),
      action,
    };
  }

  const normalized = latestUserMessage.toLowerCase();
  const sources = options.sources ?? (await lookupWeb(latestUserMessage));

  if (sources.length > 0) {
    return {
      content: buildWebReply(latestUserMessage, sources),
      sources,
    };
  }

  if (
    /remember|earlier|previous|last time|did we|what did we|from my notes|my notes|based on my notes|continue from/i.test(
      normalized,
    )
  ) {
    return { content: buildMemoryRecallReply(ctx) };
  }

  if (/summari[sz]e|my day|daily snapshot|daily summary/.test(normalized)) {
    return { content: buildSummaryReply(ctx) };
  }

  if (/focus|priorit|what should i do|what next/.test(normalized)) {
    return { content: buildFocusReply(ctx) };
  }

  if (
    /plan|schedule|organi[sz]e my day|map my day|today plan|plan my day/.test(
      normalized,
    )
  ) {
    return { content: buildPlanningReply(ctx) };
  }

  if (/spend|budget|money|finance|insight/.test(normalized)) {
    return { content: buildMoneyReply(ctx) };
  }

  if (
    /advice|how should i|what do you think|help me decide|should i\b|how can i/.test(
      normalized,
    )
  ) {
    return { content: buildAdviceReply(latestUserMessage, ctx) };
  }

  return {
    content:
      "I can advise, plan, summarize, search the web with sources, and record real actions. Try `look up the latest budgeting apps`, `I got KSh 1,000 from Ali`, `summarize my day`, or `add task: review budget`.",
  };
}

function buildSystemPrompt(ctx: AIContext): string {
  const recentTasks =
    ctx.tasks?.recent
      ?.slice(0, 6)
      .map((task) => `- ${describeTask(task)}`)
      .join("\n") ?? "- No recent task data available.";
  const recentTransactions =
    ctx.money?.recent
      ?.slice(0, 6)
      .map(
        (entry) =>
          `- ${entry.type} ${formatMoneyAmount(entry.amount, ctx.money?.currency ?? "KES")} in ${entry.category}${entry.description ? ` (${entry.description})` : ""} on ${entry.date}`,
      )
      .join("\n") ?? "- No recent transaction data available.";
  const recentGoals =
    ctx.goals?.recent
      ?.slice(0, 5)
      .map(
        (goal) =>
          `- ${goal.title} at ${goal.progress}%${goal.deadline ? `, deadline ${goal.deadline}` : ""}${goal.category ? `, category ${goal.category}` : ""}`,
      )
      .join("\n") ?? "- No active goal data available.";
  const recentHabits =
    ctx.habits?.streaking
      ?.slice(0, 5)
      .map((habit) => `- ${habit.name}, streak ${habit.streak}`)
      .join("\n") ?? "- No habit streak data available.";
  const recentNotes =
    ctx.recentNotes
      ?.slice(0, 4)
      .map((note) => `- ${note}`)
      .join("\n") ?? "- No recent notes available.";
  const retrievedMemories =
    ctx.memories
      ?.slice(0, 4)
      .map(
        (memory) =>
          `- [${memory.source}] ${memory.title ? `${memory.title} — ` : ""}${clipMemory(memory, 220)} (from ${memory.createdAt})`,
      )
      .join("\n") ?? "- No retrieved long-term memory for this query.";

  return `You are Veritus AI, a high-judgment personal strategist, researcher, and operator for one user. Be practical, accurate, and direct.

Behavior:
- Lead with the best answer or recommendation, not warm-up filler.
- Ground advice in the user's real context whenever possible: mention task titles, goal names, money pressure, note themes, or habits.
- Use retrieved long-term memory from past chats and notes when it is relevant, but do not overclaim if the memory is weak or ambiguous.
- If current web research is provided, use it and stay grounded in it.
- Never pretend to have current information unless web research was supplied.
- Ask one clarifying question only when it prevents a wrong answer.
- For plans, give an ordered sequence.
- For comparisons, give a recommendation and the tradeoff.
- Use KSh wording whenever money is mentioned in Kenyan currency context.
- Keep answers compact, but use bullets if structure helps.

Context:
User: ${ctx.profile?.name ?? "Private workspace owner"}
Today: ${ctx.today ?? "Unknown"}
${ctx.tasks ? `Tasks ${ctx.tasks.pending} pending, ${ctx.tasks.urgent} urgent, ${ctx.tasks.inProgress ?? 0} in progress, ${ctx.tasks.focus ?? 0} in focus.` : ""}
${ctx.money ? `Money balance ${ctx.money.currency} ${ctx.money.balance.toFixed(2)}. Income ${ctx.money.income ?? 0}. Expense ${ctx.money.expense ?? 0}.` : ""}
${ctx.habits ? `Habits ${ctx.habits.completedToday}/${ctx.habits.total} completed today.` : ""}
${ctx.goals ? `Goals ${ctx.goals.active} active.` : ""}

Recent tasks:
${recentTasks}

Recent money:
${recentTransactions}

Recent goals:
${recentGoals}

Habit streaks:
${recentHabits}

Recent notes:
${recentNotes}

Retrieved memory relevant to this query:
${retrievedMemories}

If the user asks you to perform an action, output a JSON object first with one of these actions:
add_task, log_expense, log_income, add_habit, add_goal, add_note.

Treat natural money statements as actions too. Example: "I got KSh 1,000 from Ali" should become log_income. "I spent KSh 500 on lunch" should become log_expense.

Then give one short confirmation sentence. For normal questions, answer directly in under 180 words.`;
}

export async function chat(
  messages: AIMessage[],
  ctx: AIContext = {},
): Promise<AIChatResult> {
  const latestUserMessage = getLatestUserMessage(messages)?.trim() ?? "";
  const sources = latestUserMessage ? await lookupWeb(latestUserMessage) : [];
  const openai = getOpenAIClient();
  if (!openai) {
    return localChat(messages, ctx, { sources });
  }

  const systemMsg: AIMessage = {
    role: "system",
    content: buildSystemPrompt(ctx),
  };

  const webResearchMsg = sources.length
    ? ({
        role: "system",
        content: buildWebResearchPrompt(latestUserMessage, sources),
      } satisfies AIMessage)
    : null;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        systemMsg,
        ...(webResearchMsg ? [webResearchMsg] : []),
        ...messages,
      ],
      max_tokens: MAX_MODEL_TOKENS,
      temperature: 0.35,
    });

    const rawContent = response.choices[0]?.message?.content ?? "";
    const action = extractAction(rawContent);
    const content =
      stripActionBlock(rawContent) ||
      (action
        ? buildActionReply(action, ctx.money?.currency ?? "KES")
        : "I am ready for your next move.");

    return { content, action, sources };
  } catch {
    return localChat(messages, ctx, { sources });
  }
}

export async function generateInsight(prompt: string): Promise<string> {
  const openai = getOpenAIClient();

  if (!openai) {
    const fallback = await localChat([{ role: "user", content: prompt }], {});
    return fallback.content;
  }

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 220,
      temperature: 0.35,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch {
    const fallback = await localChat([{ role: "user", content: prompt }], {});
    return fallback.content;
  }
}
