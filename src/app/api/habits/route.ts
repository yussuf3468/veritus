import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { HabitSchema, HabitCompletionSchema } from "@/lib/validators";
import { format } from "date-fns";

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function GET() {
  const { user, supabase } = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = format(new Date(), "yyyy-MM-dd");
  const thirtyDaysAgo = format(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd",
  );

  const [habits, completions] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
    supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_date", thirtyDaysAgo)
      .lte("completed_date", today),
  ]);

  return NextResponse.json({
    data: { habits: habits.data ?? [], completions: completions.data ?? [] },
  });
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { action, ...rest } = body;

  // Toggle completion
  if (action === "toggle") {
    const parse = HabitCompletionSchema.safeParse(rest);
    if (!parse.success)
      return NextResponse.json(
        { error: parse.error.flatten() },
        { status: 400 },
      );

    const date = parse.data.completed_date ?? format(new Date(), "yyyy-MM-dd");

    // Check if already completed
    const { data: existing } = await supabase
      .from("habit_completions")
      .select("id")
      .eq("habit_id", parse.data.habit_id)
      .eq("completed_date", date)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase.from("habit_completions").delete().eq("id", existing.id);
      await recalcStreak(supabase, parse.data.habit_id, user.id);
      return NextResponse.json({ data: { completed: false } });
    } else {
      const { data } = await supabase
        .from("habit_completions")
        .insert({
          habit_id: parse.data.habit_id,
          completed_date: date,
          user_id: user.id,
        })
        .select()
        .single();
      await recalcStreak(supabase, parse.data.habit_id, user.id);
      return NextResponse.json(
        { data: { completed: true, completion: data } },
        { status: 201 },
      );
    }
  }

  // Create habit
  const parse = HabitSchema.safeParse(rest);
  if (!parse.success)
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("habits")
    .insert({ ...parse.data, user_id: user.id })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

async function recalcStreak(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  habitId: string,
  userId: string,
) {
  const { data: completions } = await supabase
    .from("habit_completions")
    .select("completed_date")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .order("completed_date", { ascending: false });

  if (!completions?.length) {
    await supabase.from("habits").update({ streak: 0 }).eq("id", habitId);
    return;
  }

  const dates = completions
    .map((c: { completed_date: string }) => c.completed_date)
    .sort()
    .reverse();
  let streak = 0;
  let current = format(new Date(), "yyyy-MM-dd");

  for (const d of dates) {
    if (d === current) {
      streak++;
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 1);
      current = format(prev, "yyyy-MM-dd");
    } else {
      break;
    }
  }

  const { data: habit } = await supabase
    .from("habits")
    .select("longest_streak")
    .eq("id", habitId)
    .single();
  await supabase
    .from("habits")
    .update({
      streak,
      longest_streak: Math.max(streak, habit?.longest_streak ?? 0),
    })
    .eq("id", habitId);
}
