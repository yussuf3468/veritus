import { createClient } from "@/lib/supabase/server";
import { OverviewCards } from "@/components/dashboard/OverviewCards";
import { format, subDays } from "date-fns";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const now = new Date();

  const today = format(now, "yyyy-MM-dd");
  const monthStart = `${today.slice(0, 7)}-01`;
  const weekStart = format(subDays(now, 7), "yyyy-MM-dd");

  const [
    tasks,
    txs,
    habits,
    completions,
    goals,
    devices,
    profile,
    agendaTasks,
    recentTxs,
    activeGoals,
    todayHabits,
    learningSessions,
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id,status,priority,is_focus")
      .eq("user_id", user.id),
    supabase
      .from("transactions")
      .select("type,amount")
      .eq("user_id", user.id)
      .gte("date", monthStart),
    supabase.from("habits").select("id").eq("user_id", user.id),
    supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("user_id", user.id)
      .eq("completed_date", today),
    supabase.from("goals").select("id,status,progress").eq("user_id", user.id),
    supabase.from("devices").select("id,is_online").eq("user_id", user.id),
    supabase
      .from("user_profiles")
      .select("currency")
      .eq("id", user.id)
      .single(),

    supabase
      .from("tasks")
      .select("id,title,priority,due_date,status")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(8),

    supabase
      .from("transactions")
      .select("id,type,amount,description,category,date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5),

    supabase
      .from("goals")
      .select("id,title,progress,category")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("progress", { ascending: false })
      .limit(4),

    supabase
      .from("habits")
      .select("id,name,streak")
      .eq("user_id", user.id)
      .eq("frequency", "daily")
      .limit(6),

    supabase
      .from("learning_sessions")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .gte("date", weekStart),
  ]);

  const currency = profile.data?.currency ?? "USD";

  const learningHoursThisWeek =
    (learningSessions.data ?? []).reduce(
      (s, sess) => s + (sess.duration_minutes ?? 0),
      0,
    ) / 60;

  const summaryGoals = goals.data ?? [];
  const avgProgress =
    summaryGoals.filter((g) => g.status === "active").length > 0
      ? Math.round(
          summaryGoals
            .filter((g) => g.status === "active")
            .reduce((s, g) => s + g.progress, 0) /
            summaryGoals.filter((g) => g.status === "active").length,
        )
      : 0;

  const summary = {
    tasks: {
      total: tasks.data?.length ?? 0,
      pending: tasks.data?.filter((t) => t.status === "pending").length ?? 0,
      completed:
        tasks.data?.filter((t) => t.status === "completed").length ?? 0,
      inFocus: tasks.data?.filter((t) => t.is_focus).length ?? 0,
      urgent: tasks.data?.filter((t) => t.priority === "urgent").length ?? 0,
    },
    money: {
      income:
        txs.data
          ?.filter((t) => t.type === "income")
          .reduce((a, t) => a + Number(t.amount), 0) ?? 0,
      expense:
        txs.data
          ?.filter((t) => t.type === "expense")
          .reduce((a, t) => a + Number(t.amount), 0) ?? 0,
      balance: (txs.data ?? []).reduce(
        (a, t) =>
          t.type === "income" ? a + Number(t.amount) : a - Number(t.amount),
        0,
      ),
      currency,
    },
    habits: {
      total: habits.data?.length ?? 0,
      completedToday: completions.data?.length ?? 0,
    },
    goals: {
      active: goals.data?.filter((g) => g.status === "active").length ?? 0,
      completed:
        goals.data?.filter((g) => g.status === "completed").length ?? 0,
      avgProgress,
    },
    devices: {
      total: devices.data?.length ?? 0,
      online: devices.data?.filter((d) => d.is_online).length ?? 0,
    },
    learningHoursThisWeek,
    agendaTasks: agendaTasks.data ?? [],
    recentTxs: recentTxs.data ?? [],
    activeGoals: activeGoals.data ?? [],
    todayHabits: todayHabits.data ?? [],
    completedHabitIds: (completions.data ?? []).map((c) => c.habit_id),
  };

  return (
    <OverviewCards
      summary={summary}
      snapshotDateLabel={format(now, "EEEE, MMMM d")}
      dayPeriod={
        now.getHours() < 12
          ? "morning"
          : now.getHours() < 17
            ? "afternoon"
            : "evening"
      }
    />
  );
}
