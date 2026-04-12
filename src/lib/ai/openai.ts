import OpenAI from "openai";

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim();
const MAX_MODEL_TOKENS = 220;
const HAS_MODEL_PROVIDER = Boolean(
  OPENAI_API_KEY && OPENAI_API_KEY !== "your-openai-api-key",
);

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIContext {
  tasks?: { pending: number; urgent: number };
  money?: { balance: number; currency: string };
  habits?: { total: number; completedToday: number };
  goals?: { active: number };
  recentNotes?: string[];
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

function buildSummaryReply(ctx: AIContext) {
  const lines = ["Here is your current snapshot:"];

  if (ctx.tasks) {
    lines.push(
      `You have ${ctx.tasks.pending} pending task${ctx.tasks.pending === 1 ? "" : "s"}${ctx.tasks.urgent > 0 ? `, including ${ctx.tasks.urgent} urgent` : ""}.`,
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

  if (ctx.money) {
    lines.push(
      `Your current monthly balance is ${ctx.money.currency} ${ctx.money.balance.toFixed(2)}.`,
    );
  }

  lines.push("Start with the urgent task, then close one easy win to build momentum.");

  return lines.join(" ");
}

function buildFocusReply(ctx: AIContext) {
  if (ctx.tasks?.urgent) {
    return `Your first move should be clearing the ${ctx.tasks.urgent} urgent task${ctx.tasks.urgent === 1 ? "" : "s"}. After that, pick one pending item that reduces tomorrow's load.`;
  }

  if ((ctx.tasks?.pending ?? 0) > 0) {
    return `You do not have urgent tasks right now. Pick one high-leverage pending task, then use the rest of the session to finish a second smaller item.`;
  }

  if ((ctx.habits?.total ?? 0) > 0 && (ctx.habits?.completedToday ?? 0) < (ctx.habits?.total ?? 0)) {
    return "Your task list looks light, so the best focus is habit completion. Knock out the remaining daily habits while your momentum is clean.";
  }

  return "Your board looks relatively calm. Use this window for planning, reflection, or setting one concrete goal for the next session.";
}

function buildMoneyReply(ctx: AIContext) {
  if (!ctx.money) {
    return "I do not have money context yet. Try logging a few transactions and I can summarize your spending pattern.";
  }

  if (ctx.money.balance >= 0) {
    return `You are net positive this month at ${ctx.money.currency} ${ctx.money.balance.toFixed(2)}. Keep discretionary spending tight and direct the surplus toward a goal or savings bucket.`;
  }

  return `You are currently negative by ${ctx.money.currency} ${Math.abs(ctx.money.balance).toFixed(2)} this month. Cut one low-value expense category this week and avoid adding new recurring costs.`;
}

function inferAction(message: string): Record<string, unknown> | undefined {
  const taskMatch =
    message.match(/(?:^|\b)(?:add|create)\s+task[:\s-]+(.+)/i) ??
    message.match(/^task[:\s-]+(.+)/i);
  if (taskMatch?.[1]) {
    return {
      action: "add_task",
      title: taskMatch[1].trim(),
      priority: parsePriority(message),
    };
  }

  const expenseMatch = message.match(
    /(?:add|log)\s+(?:an?\s+)?expense(?:\s+of)?\s*\$?(\d+(?:\.\d{1,2})?)(?:\s+(?:for|on|in)\s+([a-zA-Z ]+))?(?:\s*[:-]\s*(.+))?/i,
  );
  if (expenseMatch) {
    return {
      action: "log_expense",
      amount: Number(expenseMatch[1]),
      category: expenseMatch[2]?.trim() || "Other",
      description: expenseMatch[3]?.trim() || null,
    };
  }

  const incomeMatch = message.match(
    /(?:add|log)\s+(?:an?\s+)?income(?:\s+of)?\s*\$?(\d+(?:\.\d{1,2})?)(?:\s+(?:for|from|in)\s+([a-zA-Z ]+))?(?:\s*[:-]\s*(.+))?/i,
  );
  if (incomeMatch) {
    return {
      action: "log_income",
      amount: Number(incomeMatch[1]),
      category: incomeMatch[2]?.trim() || "Other",
      description: incomeMatch[3]?.trim() || null,
    };
  }

  const habitMatch = message.match(/(?:^|\b)(?:add|create)\s+habit[:\s-]+(.+)/i);
  if (habitMatch?.[1]) {
    return {
      action: "add_habit",
      name: habitMatch[1].trim(),
    };
  }

  const goalMatch = message.match(/(?:^|\b)(?:add|create|set)\s+goal[:\s-]+(.+)/i);
  if (goalMatch?.[1]) {
    return {
      action: "add_goal",
      title: goalMatch[1].trim(),
      type: /long/i.test(message) ? "long_term" : "short_term",
    };
  }

  const noteMatch = message.match(/(?:^|\b)(?:add|create|save)\s+note[:\s-]+(.+)/i);
  if (noteMatch?.[1]) {
    return {
      action: "add_note",
      title: noteMatch[1].trim().slice(0, 60),
      content: noteMatch[1].trim(),
    };
  }

  return undefined;
}

export function shouldUseLocalFastPath(messages: AIMessage[]) {
  const latestUserMessage = getLatestUserMessage(messages)?.trim() ?? "";
  if (!latestUserMessage) return true;

  if (inferAction(latestUserMessage)) {
    return true;
  }

  return /summari[sz]e|my day|daily snapshot|daily summary|focus|priorit|what should i do|what next|spend|budget|money|finance|insight/i.test(
    latestUserMessage,
  );
}

function buildActionReply(action: Record<string, unknown>) {
  switch (action.action) {
    case "add_task":
      return `Adding **${String(action.title ?? "Untitled task")}** to your task list now.`;
    case "log_expense":
      return `Logging that expense now so your money view stays current.`;
    case "log_income":
      return `Logging that income now and updating your monthly balance.`;
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

export function localChat(
  messages: AIMessage[],
  ctx: AIContext,
): Promise<{ content: string; action?: Record<string, unknown> }> {
  const latestUserMessage = getLatestUserMessage(messages)?.trim() ?? "";
  const action = inferAction(latestUserMessage);

  if (action) {
    return Promise.resolve({
      content: buildActionReply(action),
      action,
    });
  }

  const normalized = latestUserMessage.toLowerCase();

  if (/summari[sz]e|my day|daily snapshot|daily summary/.test(normalized)) {
    return Promise.resolve({ content: buildSummaryReply(ctx) });
  }

  if (/focus|priorit|what should i do|what next/.test(normalized)) {
    return Promise.resolve({ content: buildFocusReply(ctx) });
  }

  if (/spend|budget|money|finance|insight/.test(normalized)) {
    return Promise.resolve({ content: buildMoneyReply(ctx) });
  }

  return Promise.resolve({
    content:
      "I can help with planning and quick actions right now. Try `summarize my day`, `what should I focus on?`, `add task: review budget`, or `log expense 45 for groceries`.",
  });
}

function buildSystemPrompt(ctx: AIContext): string {
  return `You are Veritus AI. Be concise, practical, and action-oriented.

Context:
${ctx.tasks ? `Tasks ${ctx.tasks.pending} pending, ${ctx.tasks.urgent} urgent.` : ""}
${ctx.money ? `Money balance ${ctx.money.currency} ${ctx.money.balance.toFixed(2)}.` : ""}
${ctx.habits ? `Habits ${ctx.habits.completedToday}/${ctx.habits.total} completed today.` : ""}
${ctx.goals ? `Goals ${ctx.goals.active} active.` : ""}

If the user asks you to perform an action, output a JSON object first with one of these actions:
add_task, log_expense, log_income, add_habit, add_goal, add_note.

Then give one short confirmation sentence. For normal questions, answer directly in under 120 words.`;
}

export async function chat(
  messages: AIMessage[],
  ctx: AIContext = {},
): Promise<{ content: string; action?: Record<string, unknown> }> {
  const openai = getOpenAIClient();
  if (!openai) {
    return localChat(messages, ctx);
  }

  const systemMsg: AIMessage = {
    role: "system",
    content: buildSystemPrompt(ctx),
  };

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [systemMsg, ...messages],
      max_tokens: MAX_MODEL_TOKENS,
      temperature: 0.4,
    });

    const rawContent = response.choices[0]?.message?.content ?? "";
    const action = extractAction(rawContent);
    const content = stripActionBlock(rawContent) ||
      (action ? buildActionReply(action) : "I am ready for your next move.");

    return { content, action };
  } catch {
    return localChat(messages, ctx);
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
      max_tokens: 160,
      temperature: 0.4,
    });
    return response.choices[0]?.message?.content ?? "";
  } catch {
    const fallback = await localChat([{ role: "user", content: prompt }], {});
    return fallback.content;
  }
}
