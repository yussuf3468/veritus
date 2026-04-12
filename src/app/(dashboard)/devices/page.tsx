import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DeviceList } from "@/components/devices/DeviceList";

export const metadata: Metadata = { title: "Devices · Veritus" };

export default async function DevicesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: devices } = await supabase
    .from("devices")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_online", { ascending: false })
    .order("last_seen", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Devices</h1>
        <p className="text-sm text-slate-400 mt-1">
          All sessions and connected devices
        </p>
      </div>
      <DeviceList initialDevices={devices ?? []} />
    </div>
  );
}
