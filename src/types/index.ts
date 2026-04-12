// ═══════════════════════════════════════════════════════════
//  Veritus — Shared TypeScript types
// ═══════════════════════════════════════════════════════════

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type GoalStatus = "active" | "completed" | "paused" | "cancelled";
export type GoalType = "short_term" | "long_term";
export type TxType = "income" | "expense";
export type Frequency = "daily" | "weekly";
export type DeviceType = "laptop" | "phone" | "tablet" | "desktop" | "other";

// ─── Database row types ──────────────────────────────────────

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  currency: string;
  ai_enabled: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  tags: string[];
  is_focus: boolean;
  ai_suggested: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningSubject {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  description: string | null;
  progress: number;
  target_hours: number;
  logged_hours: number;
  goal: string | null;
  resources: string[];
  color: string;
  created_at: string;
  updated_at: string;
}

export interface LearningSession {
  id: string;
  user_id: string;
  subject_id: string;
  duration_minutes: number;
  notes: string | null;
  date: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  linked_notes: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: Frequency;
  streak: number;
  longest_streak: number;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface HabitCompletion {
  id: string;
  user_id: string;
  habit_id: string;
  completed_date: string;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  progress: number;
  deadline: string | null;
  category: string | null;
  ai_suggested: boolean;
  created_at: string;
  updated_at: string;
  milestones?: GoalMilestone[];
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  device_type: DeviceType;
  os: string | null;
  browser: string | null;
  ip_address: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  is_online: boolean;
  is_trusted: boolean;
  last_seen: string;
  user_agent: string | null;
  session_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceActivityLog {
  id: string;
  device_id: string;
  user_id: string;
  action: string;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AIChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── API response shapes ─────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Dashboard summary ───────────────────────────────────────

export interface DashboardSummary {
  tasks: {
    total: number;
    pending: number;
    completed: number;
    inFocus: number;
    urgent: number;
  };
  money: {
    income: number;
    expense: number;
    balance: number;
    currency: string;
  };
  habits: {
    total: number;
    completedToday: number;
  };
  goals: {
    active: number;
    completed: number;
  };
  devices: {
    total: number;
    online: number;
  };
  learningHoursThisWeek: number;
}
