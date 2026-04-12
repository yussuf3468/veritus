import { create } from "zustand";
import type { Task } from "@/types";

interface TaskState {
  tasks: Task[];
  loading: boolean;
  filter: "all" | "pending" | "in_progress" | "completed";
  focusMode: boolean;

  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setFilter: (filter: TaskState["filter"]) => void;
  toggleFocusMode: () => void;
  setLoading: (v: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  loading: false,
  filter: "all",
  focusMode: false,

  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  setFilter: (filter) => set({ filter }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setLoading: (loading) => set({ loading }),
}));
