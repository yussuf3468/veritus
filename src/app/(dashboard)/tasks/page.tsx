import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { TaskList } from "@/components/tasks/TaskList";
import type { Task } from "@/types";

export const metadata: Metadata = { title: "Tasks · Veritus" };

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialTasks: Task[] = [];

  if (user) {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    initialTasks = (data as Task[] | null) ?? [];
  }

  return <TaskList initialTasks={initialTasks} initialLoaded />;
}
