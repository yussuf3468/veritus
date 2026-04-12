import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { LearningSubjectSchema, LearningSessionSchema } from "@/lib/validators";

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

  const [subjects, sessions] = await Promise.all([
    supabase
      .from("learning_subjects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("learning_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    data: { subjects: subjects.data ?? [], sessions: sessions.data ?? [] },
  });
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, ...rest } = body; // type: 'subject' | 'session'

  if (type === "session") {
    const parse = LearningSessionSchema.safeParse(rest);
    if (!parse.success)
      return NextResponse.json(
        { error: parse.error.flatten() },
        { status: 400 },
      );

    const { data, error } = await supabase
      .from("learning_sessions")
      .insert({ ...parse.data, user_id: user.id })
      .select()
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Update logged_hours on subject
    const subjectSessions = await supabase
      .from("learning_sessions")
      .select("duration_minutes")
      .eq("subject_id", parse.data.subject_id);

    const totalMinutes = (subjectSessions.data ?? []).reduce(
      (a, s) => a + s.duration_minutes,
      0,
    );
    await supabase
      .from("learning_subjects")
      .update({ logged_hours: +(totalMinutes / 60).toFixed(2) })
      .eq("id", parse.data.subject_id)
      .eq("user_id", user.id);

    return NextResponse.json({ data }, { status: 201 });
  }

  // Default: create subject
  const parse = LearningSubjectSchema.safeParse(rest);
  if (!parse.success)
    return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });

  const { data, error } = await supabase
    .from("learning_subjects")
    .insert({ ...parse.data, user_id: user.id })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
