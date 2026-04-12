import { create } from "zustand";
import type { Transaction, SavingsGoal } from "@/types";

interface MoneyState {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  loading: boolean;
  monthFilter: string; // 'YYYY-MM'

  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  removeTransaction: (id: string) => void;
  setSavingsGoals: (goals: SavingsGoal[]) => void;
  addSavingsGoal: (g: SavingsGoal) => void;
  setMonthFilter: (m: string) => void;
  setLoading: (v: boolean) => void;

  // Derived
  balance: (txs?: Transaction[]) => number;
  income: (txs?: Transaction[]) => number;
  expenses: (txs?: Transaction[]) => number;
}

export const useMoneyStore = create<MoneyState>((set, get) => ({
  transactions: [],
  savingsGoals: [],
  loading: false,
  monthFilter: new Date().toISOString().slice(0, 7),

  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (tx) =>
    set((s) => ({ transactions: [tx, ...s.transactions] })),
  removeTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
  setSavingsGoals: (savingsGoals) => set({ savingsGoals }),
  addSavingsGoal: (g) => set((s) => ({ savingsGoals: [g, ...s.savingsGoals] })),
  setMonthFilter: (monthFilter) => set({ monthFilter }),
  setLoading: (loading) => set({ loading }),

  balance: (txs) => {
    const list = txs ?? get().transactions;
    return list.reduce(
      (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
      0,
    );
  },
  income: (txs) => {
    const list = txs ?? get().transactions;
    return list
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + t.amount, 0);
  },
  expenses: (txs) => {
    const list = txs ?? get().transactions;
    return list
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + t.amount, 0);
  },
}));
