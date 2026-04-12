import { Suspense } from "react";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MoneyTracker } from "@/components/money/MoneyTracker";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Money · Veritus" };

export default async function MoneyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const month = format(new Date(), "yyyy-MM");
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user!.id)
    .gte("date", `${month}-01`)
    .lte("date", `${month}-31`)
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Money</h1>
        <p className="text-sm text-slate-400 mt-1">Track income & expenses</p>
      </div>
      <Suspense
        fallback={<div className="text-slate-500 text-sm">Loading…</div>}
      >
        <MoneyTracker
          initialTransactions={transactions ?? []}
          initialMonth={month}
        />
      </Suspense>
    </div>
  );
}
