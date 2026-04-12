import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LearningList } from "@/components/learning/LearningList";

export const metadata: Metadata = { title: "Learning · Veritus" };

export default async function LearningPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: subjects }, { data: sessions }] = await Promise.all([
    supabase
      .from("learning_subjects")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("learning_sessions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Learning</h1>
        <p className="text-sm text-slate-400 mt-1">
          Track subjects and study sessions
        </p>
      </div>
      <LearningList
        initialSubjects={subjects ?? []}
        initialSessions={sessions ?? []}
      />
    </div>
  );
}
