import { z } from "zod";

// ─── Tasks ───────────────────────────────────────────────────
export const TaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .default("pending"),
  due_date: z.string().datetime({ offset: true }).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).default([]),
  is_focus: z.boolean().default(false),
  ai_suggested: z.boolean().default(false),
});

export const TaskUpdateSchema = TaskSchema.partial();

// ─── Transactions ─────────────────────────────────────────────
export const TransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().max(999_999_999),
  category: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  tags: z.array(z.string()).max(10).default([]),
});

export const SavingsGoalSchema = z.object({
  name: z.string().min(1).max(200),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

// ─── Learning ─────────────────────────────────────────────────
export const LearningSubjectSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  target_hours: z.number().min(0).optional(),
  logged_hours: z.number().min(0).optional(),
  goal: z.string().max(500).optional(),
  resources: z.array(z.string()).max(20).default([]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#00d4ff"),
});

export const LearningSessionSchema = z.object({
  subject_id: z.string().uuid(),
  duration_minutes: z.number().int().positive().max(1440),
  notes: z.string().max(1000).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ─── Notes ────────────────────────────────────────────────────
export const NoteSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().max(100_000).default(""),
  tags: z.array(z.string().max(50)).max(20).default([]),
  linked_notes: z.array(z.string().uuid()).max(50).default([]),
  is_pinned: z.boolean().default(false),
});

// ─── Habits ───────────────────────────────────────────────────
export const HabitSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#00d4ff"),
  icon: z.string().max(4).default("⭐"),
});

export const HabitCompletionSchema = z.object({
  habit_id: z.string().uuid(),
  completed_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ─── Goals ────────────────────────────────────────────────────
export const GoalSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  type: z.enum(["short_term", "long_term"]).default("short_term"),
  status: z
    .enum(["active", "completed", "paused", "cancelled"])
    .default("active"),
  progress: z.number().int().min(0).max(100).default(0),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  category: z.string().max(100).optional(),
});

export const MilestoneSchema = z.object({
  goal_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  completed: z.boolean().default(false),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

// ─── Devices ──────────────────────────────────────────────────
export const DeviceSchema = z.object({
  name: z.string().min(1).max(200),
  device_type: z
    .enum(["laptop", "phone", "tablet", "desktop", "other"])
    .default("other"),
  os: z.string().max(100).optional(),
  browser: z.string().max(100).optional(),
  ip_address: z.string().max(45).optional(),
  location: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  is_trusted: z.boolean().default(false),
  user_agent: z.string().max(500).optional(),
  session_token: z.string().max(128).optional(),
});

// ─── Notification Programs ──────────────────────────────────
export const NotificationProgramSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  prompt: z.string().min(1).max(1200),
  delivery_mode: z
    .enum(["standard", "time_sensitive", "immersive"])
    .default("immersive"),
  schedule_type: z.enum(["once", "daily", "weekly"]).default("daily"),
  schedule_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default("07:00"),
  schedule_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([]),
  is_enabled: z.boolean().default(true),
  full_screen_intent: z.boolean().default(true),
});

export const NotificationProgramUpdateSchema =
  NotificationProgramSchema.partial();

// ─── AI ───────────────────────────────────────────────────────
export const AIMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const AIChatSchema = z.object({
  messages: z.array(AIMessageSchema).min(1).max(50),
});
