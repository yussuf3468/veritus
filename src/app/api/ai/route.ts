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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const [tasks, txs, habits, completions, goals, profile] = await Promise.all([
    supabase.from("tasks").select("id,status,priority").eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("type,amount")
      .eq("user_id", user.id)
      .gte("date", `${today.slice(0, 7)}-01`),
    supabase.from("habits").select("id").eq("user_id", user.id),
    supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("user_id", user.id)
      .eq("completed_date", today),
    supabase
      .from("goals")
      .select("id,status")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabase
      .from("user_profiles")
      .select("currency")
      .eq("id", user.id)
      .single(),
  ]);

  const ctx: AIContext = {
    tasks: {
      pending: (tasks.data ?? []).filter((t) => t.status === "pending").length,
      urgent: (tasks.data ?? []).filter((t) => t.priority === "urgent").length,
    },
    money: {
      balance: (txs.data ?? []).reduce(
        (a, t) =>
          t.type === "income" ? a + Number(t.amount) : a - Number(t.amount),
        0,
      ),
      currency: resolveCurrencyCode(profile.data?.currency),
    },
    habits: {
      total: (habits.data ?? []).length,
      completedToday: (completions.data ?? []).length,
    },
    goals: { active: (goals.data ?? []).length },
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

  const lastUserMsg = parse.data.messages.at(-1);
  const persistHistory = (async () => {
    await supabase.from("ai_chat_history").insert([
      { user_id: user.id, role: "user", content: lastUserMsg?.content ?? "" },
      {
        user_id: user.id,
        role: "assistant",
        content,
        metadata:
          action || (sources?.length ?? 0) > 0 ? { action, sources } : null,
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
    data: { content, action, actionResult, actionError, sources },
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
