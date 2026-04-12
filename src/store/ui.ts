import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  aiChatOpen: boolean;
  activeModal: string | null;
  theme: "dark";

  toggleSidebar: () => void;
  setSidebar: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  toggleAIChat: () => void;
  setAIChat: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  aiChatOpen: false,
  activeModal: null,
  theme: "dark",

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),
  toggleMobileSidebar: () =>
    set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setMobileSidebar: (open) => set({ mobileSidebarOpen: open }),
  toggleAIChat: () => set((s) => ({ aiChatOpen: !s.aiChatOpen })),
  setAIChat: (open) => set({ aiChatOpen: open }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
