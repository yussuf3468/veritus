import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AIChat } from "@/components/ai/AIChat";
import { formatCurrency, resolveCurrencyCode } from "@/lib/utils";
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
  const dueSoon = (tasks ?? []).filter(
    (task) =>
      task.due_date &&
      task.status !== "completed" &&
      task.status !== "cancelled",
  ).length;

  const promptCards = [
    "Plan my day around my tasks and habits.",
    "What should I focus on first, and why?",
    "What did we decide about my budget last time?",
    "Look up the latest budgeting apps and compare them.",
    "Summarize my current system health across tasks, money, and goals.",
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
      title: "Action engine",
      detail:
        "The same workspace can research, advise, and then write into the rest of Veritus.",
      value: `${formatCurrency(balance, currency)} live context`,
      icon: <Bot size={16} className="text-emerald-300" />,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,32,0.96),rgba(9,10,18,0.94))] p-5 shadow-[0_24px_72px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_34%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-cyan/20 bg-brand-cyan/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-brand-cyan">
              <Sparkles size={12} />
              Veritus AI
            </div>
            <h1 className="mt-3 text-[25px] font-semibold tracking-tight text-white sm:text-[32px] sm:leading-[1.1]">
              A proper AI cockpit for strategy, research, recall, and action.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
              This page should feel closer to a mission control surface than a
              generic chat window. It now combines command lanes, persistent
              memory, visible research, and a stronger thread stage in one
              place.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {pendingTasks} pending tasks
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {urgentTasks} urgent
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {dueSoon} with due dates
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {formatCurrency(balance, currency)} this month
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
                {memoryCount ?? 0} saved chat memories
              </span>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {stageCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[22px] border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
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

          <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-center gap-2 text-white">
              <Brain size={16} className="text-brand-cyan" />
              <p className="text-sm font-semibold">Command Prompts</p>
            </div>
            <div className="mt-4 space-y-2">
              {promptCards.map((prompt, index) => (
                <div
                  key={prompt}
                  className="rounded-[18px] border border-white/8 bg-white/[0.03] px-3.5 py-3 transition-colors hover:bg-white/[0.05]"
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

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <AIChat mode="page" />
    </div>
  );
}
