import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MoneyTracker } from "@/components/money/MoneyTracker";
import { endOfMonth, format, startOfMonth } from "date-fns";

export const metadata: Metadata = { title: "Money · Veritus" };

export default async function MoneyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const month = format(new Date(), "yyyy-MM");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const [{ data: transactions }, { data: savingsGoals }, { data: profile }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: false }),
      supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_profiles")
        .select("currency")
        .eq("id", user!.id)
        .single(),
    ]);

  return (
    <MoneyTracker
      initialTransactions={transactions ?? []}
      initialSavingsGoals={savingsGoals ?? []}
      initialMonth={month}
      currency={profile?.currency ?? "USD"}
    />
  );
}
