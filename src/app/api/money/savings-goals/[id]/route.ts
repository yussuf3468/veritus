import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const SavingsGoalUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  target_amount: z.number().positive().optional(),
  current_amount: z.number().min(0).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/)
    .optional()
    .nullable(),
});

function normalizeDeadline(deadline?: string | null) {
  if (!deadline) return null;
  if (/^\d{4}-\d{2}$/.test(deadline)) {
    return `${deadline}-01`;
  }
  return deadline;
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user, supabase };
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user, supabase } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const payload = {
    ...body,
    deadline: normalizeDeadline(body.deadline),
  };
  const parsed = SavingsGoalUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const { user, supabase } = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { id } });
}