# VERITUS — Personal Life Operating System

A full-stack Personal Life Operating System built with **Next.js 14**, **Supabase**, **TailwindCSS**, and **OpenAI**. Track tasks, money, learning, notes, habits, goals, and connected devices — all from one futuristic dark interface.

---

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Framework  | Next.js 14 (App Router)                           |
| Database   | Supabase (PostgreSQL + RLS + Realtime)            |
| Auth       | Supabase Auth (SSR via `@supabase/ssr`)           |
| Styling    | TailwindCSS 3.4 + custom design tokens            |
| Animations | Framer Motion 11                                  |
| State      | Zustand 4.5                                       |
| AI         | OpenAI SDK (GPT-4o / any OpenAI-compatible model) |
| Charts     | Recharts 2                                        |
| Validation | Zod 3                                             |
| Deployment | Docker / Vercel                                   |

---

## Modules

- **Dashboard** — Animated overview with stats from all 9 modules
- **Tasks** — CRUD with priority, status, due dates, focus mode
- **Money** — Income/expense tracking with cash flow + category charts
- **Learning** — Subject cards, live study timer, session logging
- **Notes** — Markdown notes with search, pin, and live preview editor
- **Habits** — Daily/weekly habits with 7-day grid and streak tracking
- **Goals** — Long-term goals with milestone checklists and progress bars
- **Devices** — Real-time device tracking with heartbeat and trust management
- **AI Command Center** — Floating chat powered by GPT-4o; understands natural language commands and executes actions across all modules

---

## Quick Start

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key (or any OpenAI-compatible endpoint)

### 1. Clone & Install

```bash
git clone <your-repo-url> veritus
cd veritus
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in all required values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...
# Optional: override base URL for other OpenAI-compatible providers
# OPENAI_BASE_URL=https://api.openai.com/v1
```

### 3. Set Up Supabase Database

1. Open your Supabase project → **SQL Editor**
2. Paste and run the contents of `supabase/schema.sql`
3. (Optional) Paste and run `supabase/seed.sql` with your user ID to add sample data

> The schema creates 14 tables, all Row Level Security policies, triggers for `updated_at` and automatic user profile creation on signup.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### 5. Register an Account

Visit `/register` to create your account. Supabase automatically creates your `user_profiles` row via the `handle_new_user()` trigger.

---

## Production Deployment

### Docker

```bash
docker compose up --build -d
```

The container listens on port `3000`. Set environment variables in `docker-compose.yml` or via your orchestrator (Kubernetes, etc.).

### Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.local.example` in Vercel's Project Settings → Environment Variables
4. Deploy

> Vercel auto-detects Next.js. No additional configuration needed.

---

## Seed Data (Optional)

After running `schema.sql`, open `supabase/seed.sql`, replace `'YOUR_USER_ID_HERE'` with your actual Supabase user UUID (found in **Authentication → Users**), then run it in the SQL Editor.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & Register pages
│   ├── (dashboard)/     # All protected pages
│   │   ├── page.tsx     # Dashboard overview
│   │   ├── tasks/
│   │   ├── money/
│   │   ├── learning/
│   │   ├── notes/
│   │   ├── habits/
│   │   ├── goals/
│   │   └── devices/
│   └── api/             # All route handlers
├── components/
│   ├── ui/              # Button, Input, Card, Badge, Modal
│   ├── layout/          # Sidebar, Header
│   ├── ai/              # AIChat floating panel
│   ├── dashboard/       # OverviewCards
│   ├── tasks/           # TaskList
│   ├── money/           # MoneyTracker
│   ├── learning/        # LearningList
│   ├── notes/           # NoteList
│   ├── habits/          # HabitList
│   ├── goals/           # GoalList
│   └── devices/         # DeviceList
├── hooks/               # useAuth, useDeviceInfo, useRealtime
├── lib/
│   ├── supabase/        # client.ts, server.ts
│   ├── ai/              # openai.ts abstraction
│   ├── utils.ts
│   └── validators.ts    # Zod schemas
├── store/               # Zustand stores (ui, tasks, money, habits, goals)
└── types/               # TypeScript interfaces
supabase/
├── schema.sql
└── seed.sql
```

---

## AI Command Center

The floating Zap button (bottom-left) opens the AI chat. You can type natural language commands such as:

- _"Add a task to review the Q4 report by Friday, high priority"_
- _"Log $45 food expense"_
- _"I studied React for 2 hours"_
- _"Add a new habit: meditate each morning"_
- _"Create a goal: Learn Spanish by December"_
- _"Summarize my day"_

The AI detects intent, responds in plain language, and automatically executes the action against your data.

---

## Native iPhone Build

The repository now includes [ios-native/README.md](ios-native/README.md), a private SwiftUI iPhone shell that:

- embeds the existing Veritus AI command center in a native `WKWebView`
- syncs immersive alert programs from `/api/notification-programs`
- schedules local iPhone alerts and opens a custom full-screen alert surface when you open the alert

Important platform constraint: iOS does not allow arbitrary movie-style full-screen lock-screen takeovers for normal apps. The native project uses the strongest compliant path available to a sideloaded personal app: time-sensitive local notifications plus a custom full-screen immersive alert once the notification is opened.

Important install constraint: this workspace is on Windows, so the app cannot be code signed or installed on an iPhone from here. Final build/sign/install still requires macOS + Xcode + your iPhone over USB-C.

---

## License

MIT
