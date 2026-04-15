import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AIChat } from "@/components/ai/AIChat";
import { cn, formatCurrency, resolveCurrencyCode } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";
import {
  Bot,
  Brain,
  CheckSquare,
  FileText,
  Globe,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";

export const metadata: Metadata = { title: "Veritus AI · Veritus" };

export default async function AIPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [
    { data: tasks },
    { data: txs },
    { data: goals },
    { data: habits },
    { data: completions },
    { data: notes },
    { count: memoryCount },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("status, priority, due_date")
      .eq("user_id", user!.id),
    supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", user!.id)
      .gte("date", monthStart),
    supabase
      .from("goals")
      .select("status")
      .eq("user_id", user!.id)
      .eq("status", "active"),
    supabase.from("habits").select("id").eq("user_id", user!.id),
    supabase
      .from("habit_completions")
      .select("habit_id")
      .eq("user_id", user!.id)
      .eq("completed_date", format(new Date(), "yyyy-MM-dd")),
    supabase.from("notes").select("id").eq("user_id", user!.id),
    supabase
      .from("ai_chat_history")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user!.id),
    supabase
      .from("user_profiles")
      .select("currency")
      .eq("id", user!.id)
      .single(),
  ]);

  const currency = resolveCurrencyCode(profile?.currency);
  const balance = (txs ?? []).reduce(
    (sum, tx) =>
      tx.type === "income" ? sum + Number(tx.amount) : sum - Number(tx.amount),
    0,
  );
  const pendingTasks = (tasks ?? []).filter(
    (task) => task.status === "pending",
  ).length;
  const urgentTasks = (tasks ?? []).filter(
    (task) => task.priority === "urgent",
  ).length;
  const overdueTasks = (tasks ?? []).filter(
    (task) =>
      task.due_date &&
      task.due_date < format(new Date(), "yyyy-MM-dd") &&
      task.status !== "completed" &&
      task.status !== "cancelled",
  ).length;
  const dueSoon = (tasks ?? []).filter(
    (task) =>
      task.due_date &&
      task.status !== "completed" &&
      task.status !== "cancelled",
  ).length;
  const incompleteHabits = Math.max(
    (habits?.length ?? 0) - (completions?.length ?? 0),
    0,
  );

  const promptCards = [
    "Run my morning brief across tasks, money, habits, and goals.",
    "Build a recovery plan for my overdue and urgent work.",
    "Run my weekly reset across tasks, money, habits, goals, and notes.",
    "Give me an automation finance watch and next moves.",
    "What should I focus on first, and why?",
  ];

  const stageCards = [
    {
      title: "Deep reasoning",
      detail:
        "Ask for a decision, a plan, or a sharp recommendation and keep the thread focused.",
      value: `${pendingTasks} open tasks`,
      icon: <Target size={16} className="text-brand-cyan" />,
    },
    {
      title: "Persistent recall",
      detail:
        "Past chat decisions and note fragments can be surfaced inline on the next relevant turn.",
      value: `${memoryCount ?? 0} memories`,
      icon: <FileText size={16} className="text-amber-300" />,
    },
    {
      title: "Automation stack",
      detail:
        "The same workspace can now run daily briefs, rescue plans, and weekly resets across the rest of Veritus.",
      value: `${formatCurrency(balance, currency)} live context`,
      icon: <Bot size={16} className="text-emerald-300" />,
    },
  ];

  const automationCards = [
    {
      title: "Morning Brief",
      detail:
        "Generate the opening operating brief before you start moving through the day.",
      signal: `${pendingTasks} tasks · ${incompleteHabits} habits left`,
      prompt: "Run my morning brief across tasks, money, habits, and goals.",
      accent: "text-brand-cyan",
    },
    {
      title: "Recovery Plan",
      detail:
        "When pressure builds, force the system back into a smaller, winnable lane.",
      signal: `${urgentTasks} urgent · ${overdueTasks} overdue`,
      prompt: "Build a recovery plan for my overdue and urgent work.",
      accent: "text-amber-300",
    },
    {
      title: "Weekly Reset",
      detail:
        "Re-anchor tasks, habits, goals, notes, and money so next week does not start cold.",
      signal: `${goals?.length ?? 0} goals · ${notes?.length ?? 0} notes`,
      prompt:
        "Run my weekly reset across tasks, money, habits, goals, and notes.",
      accent: "text-fuchsia-300",
    },
    {
      title: "Finance Watch",
      detail:
        "Turn monthly money context into one clear operating signal and next move.",
      signal: `${formatCurrency(balance, currency)} month-to-date`,
      prompt: "Give me an automation finance watch and next moves.",
      accent: "text-emerald-300",
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in sm:space-y-5 xl:space-y-6">
      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,32,0.96),rgba(9,10,18,0.94))] p-4 shadow-[0_24px_72px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:rounded-[30px] sm:p-6 xl:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_34%)]" />
        <div className="relative grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,320px)] 2xl:grid-cols-[minmax(0,1.28fr)_360px]">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-brand-cyan">
              <Sparkles size={12} />
              Veritus AI
            </div>
            <div className="mt-2.5 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-200 sm:mt-3">
              <Bot size={11} />
              Phase 2 · AI Automation
            </div>
            <h1 className="mt-3 text-[22px] font-semibold leading-[1.08] tracking-tight text-white sm:text-[30px] sm:leading-[1.1] xl:text-[34px]">
              A proper AI cockpit for strategy, recall, research, action, and
              automation.
            </h1>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-slate-300 sm:mt-3 sm:text-[15px] sm:leading-7">
              This page should feel closer to a mission control surface than a
              generic chat window. Phase 2 pushes it further: command lanes,
              persistent memory, visible research, and automation runs now sit
              in the same operating surface.
            </p>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:flex-wrap min-[430px]:overflow-visible min-[430px]:pb-0">
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {pendingTasks} pending tasks
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {urgentTasks} urgent
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {dueSoon} with due dates
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {formatCurrency(balance, currency)} this month
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {memoryCount ?? 0} saved chat memories
              </span>
            </div>

            <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:grid min-[430px]:grid-cols-2 min-[430px]:overflow-visible min-[430px]:pb-0 2xl:grid-cols-3">
              {stageCards.map((card) => (
                <div
                  key={card.title}
                  className="min-w-[260px] snap-start rounded-[22px] border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] min-[430px]:min-w-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    {card.icon}
                    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                      {card.value}
                    </div>
                  </div>
                  <div className="mt-4 text-base font-semibold text-white">
                    {card.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    {card.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 rounded-[22px] border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-[24px] xl:p-5">
            <div className="flex items-center gap-2 text-white">
              <Brain size={16} className="text-brand-cyan" />
              <p className="text-sm font-semibold">Command Prompts</p>
            </div>
            <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:grid min-[430px]:grid-cols-2 min-[430px]:overflow-visible min-[430px]:pb-0 xl:grid-cols-1">
              {promptCards.map((prompt, index) => (
                <div
                  key={prompt}
                  className="min-w-[250px] snap-start rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3 transition-colors hover:bg-white/[0.05] min-[430px]:min-w-0"
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Prompt {index + 1}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-200">
                    {prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <CheckSquare size={16} className="text-brand-cyan" />
              <p className="text-lg font-semibold text-white">{pendingTasks}</p>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Task context
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Open queue available for prioritization.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <Wallet size={16} className="text-emerald-300" />
              <p className="text-lg font-semibold text-white">
                {formatCurrency(balance, currency)}
              </p>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Money context
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Monthly cashflow is already in view.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <Target size={16} className="text-fuchsia-300" />
              <p className="text-lg font-semibold text-white">
                {goals?.length ?? 0}
              </p>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Goals in play
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Active goals are part of the reasoning context.
            </p>
          </div>
          <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <FileText size={16} className="text-amber-300" />
              <p className="text-lg font-semibold text-white">
                {notes?.length ?? 0}
              </p>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              Notes ready
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Recent notes can shape answers and summaries.
            </p>
          </div>
        </div>
      </section>

      <section className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[430px]:grid min-[430px]:grid-cols-2 min-[430px]:overflow-visible min-[430px]:pb-0 2xl:grid-cols-4">
        {automationCards.map((card) => (
          <Link
            key={card.title}
            href={{
              pathname: "/dashboard/ai",
              query: { prompt: card.prompt, autorun: "1" },
            }}
            scroll={false}
            className="group flex h-full min-w-[280px] snap-start flex-col rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,18,30,0.92),rgba(10,11,20,0.88))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-1 hover:border-white/16 sm:rounded-[26px] min-[430px]:min-w-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Automation Run
                </div>
                <div className={cn("mt-2 text-lg font-semibold", card.accent)}>
                  {card.title}
                </div>
              </div>
              <div className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-400">
                Run
              </div>
            </div>
            <div className="mt-4 flex-1 text-sm leading-6 text-slate-300">
              {card.detail}
            </div>
            <div className="mt-4 rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {card.signal}
            </div>
          </Link>
        ))}
      </section>

      <AIChat mode="page" />
    </div>
  );
}
