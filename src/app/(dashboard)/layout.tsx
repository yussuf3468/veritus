import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MobileDock } from "@/components/layout/MobileDock";
import { AIChat } from "@/components/ai/AIChat";

const OWNER_NAME = "Yussuf Muse";

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

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "") ||
    OWNER_NAME;

  return (
    <div className="relative min-h-[100dvh] bg-bg-primary text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,212,255,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.1),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.04),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_22%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1520px] gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 xl:px-5">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            userEmail={user.email}
            userName={displayName}
            dateLabel={dateLabel}
          />

          <main className="min-w-0 flex-1 pb-28 pt-3 md:pb-6 md:pt-4">
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>

      <MobileDock />
      <AIChat />
    </div>
  );
}
