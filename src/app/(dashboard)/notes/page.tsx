import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { NoteList } from "@/components/notes/NoteList";

export const metadata: Metadata = { title: "Notes · Veritus" };

export default async function NotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notes</h1>
        <p className="text-sm text-slate-400 mt-1">
          Markdown-powered personal knowledge base
        </p>
      </div>
      <NoteList initialNotes={notes ?? []} />
    </div>
  );
}
