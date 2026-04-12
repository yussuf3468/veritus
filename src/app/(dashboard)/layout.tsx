import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileDock } from "@/components/layout/MobileDock";
import { AIChat } from "@/components/ai/AIChat";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-primary">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(0,212,255,0.07),transparent)]" />

      <div className="relative flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header
            userEmail={user.email}
            userName={profile?.full_name ?? user.email?.split("@")[0]}
          />

          <main className="flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-6 md:px-8 md:pb-8 md:pt-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      <MobileDock />
      <AIChat />
    </div>
  );
}
