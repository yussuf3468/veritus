import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HabitList } from "@/components/habits/HabitList";
import { format, subDays } from "date-fns";

export const metadata: Metadata = { title: "Habits · Veritus" };

export default async function HabitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const [{ data: habits }, { data: completions }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user!.id)
      .gte("completed_date", since),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Habits</h1>
        <p className="text-sm text-slate-400 mt-1">
          Build streaks and track your daily routines
        </p>
      </div>
      <HabitList
        initialHabits={habits ?? []}
        initialCompletions={completions ?? []}
      />
    </div>
  );
}
