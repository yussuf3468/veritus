import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoalSchema, MilestoneSchema } from "@/lib/validators";

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

  const [goals, milestones] = await Promise.all([
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("goal_milestones")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const goalsWithMilestones = (goals.data ?? []).map((g) => ({
    ...g,
    milestones: (milestones.data ?? []).filter((m) => m.goal_id === g.id),
  }));

  return NextResponse.json({ data: goalsWithMilestones });
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type: entityType, ...rest } = body;

  if (entityType === "milestone") {
    const parse = MilestoneSchema.safeParse(rest);
    if (!parse.success)
      return NextResponse.json(
        { error: parse.error.flatten() },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("goal_milestones")
      .insert({ ...parse.data, user_id: user.id })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  }

  const parse = GoalSchema.safeParse(rest);
  if (!parse.success)
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("goals")
    .insert({ ...parse.data, user_id: user.id })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
