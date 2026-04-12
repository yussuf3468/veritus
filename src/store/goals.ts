import { create } from "zustand";
import type { Goal, GoalMilestone } from "@/types";

interface GoalsState {
  goals: Goal[];
  loading: boolean;
  setGoals: (goals: Goal[]) => void;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  addMilestone: (goalId: string, milestone: GoalMilestone) => void;
  toggleMilestone: (
    goalId: string,
    milestoneId: string,
    completed: boolean,
  ) => void;
  setLoading: (v: boolean) => void;
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  loading: false,

  setGoals: (goals) => set({ goals }),
  setLoading: (loading) => set({ loading }),

  addGoal: (goal) => set((s) => ({ goals: [goal, ...s.goals] })),

  updateGoal: (id, updates) =>
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    })),

  removeGoal: (id) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

  addMilestone: (goalId, milestone) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === goalId
          ? { ...g, milestones: [...(g.milestones ?? []), milestone] }
          : g,
      ),
    })),

  toggleMilestone: (goalId, milestoneId, completed) =>
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        const milestones = (g.milestones ?? []).map((m) =>
          m.id === milestoneId ? { ...m, completed } : m,
        );
        return { ...g, milestones };
      }),
    })),
}));
