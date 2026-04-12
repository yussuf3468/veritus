import { Metadata } from "next";
import { TaskList } from "@/components/tasks/TaskList";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return <TaskList />;
}
