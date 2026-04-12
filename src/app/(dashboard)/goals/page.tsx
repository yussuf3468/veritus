import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { GoalList } from "@/components/goals/GoalList";

export const metadata: Metadata = { title: "Goals · Veritus" };

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });
  const { data: milestones } = await supabase
    .from("goal_milestones")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true });

  const goalsWithMilestones = (goals ?? []).map((g) => ({
    ...g,
    milestones: (milestones ?? []).filter((m) => m.goal_id === g.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Goals</h1>
        <p className="text-sm text-slate-400 mt-1">
          Long-term objectives with milestone tracking
        </p>
      </div>
      <GoalList initialGoals={goalsWithMilestones} />
    </div>
  );
}
