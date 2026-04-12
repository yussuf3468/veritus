import { create } from "zustand";
import type { Habit, HabitCompletion } from "@/types";
import { format } from "date-fns";

interface HabitState {
  habits: Habit[];
  completions: HabitCompletion[];
  loading: boolean;

  setHabits: (habits: Habit[]) => void;
  addHabit: (habit: Habit) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  removeHabit: (id: string) => void;
  setCompletions: (completions: HabitCompletion[]) => void;
  addCompletion: (c: HabitCompletion) => void;
  removeCompletion: (habitId: string, date: string) => void;
  setLoading: (v: boolean) => void;

  isCompletedToday: (habitId: string) => boolean;
  todayCount: () => number;
}

const today = () => format(new Date(), "yyyy-MM-dd");

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  completions: [],
  loading: false,

  setHabits: (habits) => set({ habits }),
  addHabit: (habit) => set((s) => ({ habits: [...s.habits, habit] })),
  updateHabit: (id, patch) =>
    set((s) => ({
      habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    })),
  removeHabit: (id) =>
    set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
  setCompletions: (completions) => set({ completions }),
  addCompletion: (c) => set((s) => ({ completions: [...s.completions, c] })),
  removeCompletion: (habitId, date) =>
    set((s) => ({
      completions: s.completions.filter(
        (c) => !(c.habit_id === habitId && c.completed_date === date),
      ),
    })),
  setLoading: (loading) => set({ loading }),

  isCompletedToday: (habitId) => {
    const t = today();
    return get().completions.some(
      (c) => c.habit_id === habitId && c.completed_date === t,
    );
  },
  todayCount: () => {
    const t = today();
    return get().completions.filter((c) => c.completed_date === t).length;
  },
}));
