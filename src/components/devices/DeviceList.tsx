"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Smartphone,
  Shield,
  ShieldOff,
  Wifi,
  WifiOff,
  MapPin,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Skeleton,
  SkeletonStats,
  SkeletonList,
} from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Device } from "@/types";
import { format, parseISO, formatDistanceToNow } from "date-fns";

interface Props {
  initialDevices?: Device[];
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  desktop: <Monitor size={18} />,
  laptop: <Monitor size={18} />,
  mobile: <Smartphone size={18} />,
  tablet: <Smartphone size={18} />,
  other: <Globe size={18} />,
};

export function DeviceList({ initialDevices = [] }: Props) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [isInitialLoading, setIsInitialLoading] = useState(
    initialDevices.length === 0,
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/devices");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDevices(json.data);
    } catch {
      if (!silent) toast.error("Failed to load devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialDevices.length > 0) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTrust(device: Device) {
    const newTrust = !device.is_trusted;
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, is_trusted: newTrust } : d,
      ),
    );
    try {
      const res = await fetch(`/api/devices/${device.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_trusted: newTrust }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(newTrust ? "Device trusted" : "Device untrusted");
    } catch {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, is_trusted: device.is_trusted } : d,
        ),
      );
      toast.error("Failed to update trust");
    }
  }

  async function deleteDevice(id: string) {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    try {
      await fetch(`/api/devices/${id}`, { method: "DELETE" });
      toast.success("Device removed");
    } catch {
      load();
    }
  }

  const online = devices.filter((d) => d.is_online).length;
  const trusted = devices.filter((d) => d.is_trusted).length;
  const untrusted = devices.filter((d) => !d.is_trusted).length;

  if (isInitialLoading)
    return (
      <div className="space-y-6">
        <SkeletonStats count={4} />
        <SkeletonList rows={4} />
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Monitor size={13} className="text-brand-cyan" />
            <p className="text-[10px] text-slate-400">Total Devices</p>
          </div>
          <p className="text-2xl font-bold text-white">{devices.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <p className="text-[10px] text-slate-400">Online</p>
          </div>
          <p className="text-2xl font-bold text-brand-green">{online}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield size={13} className="text-brand-purple" />
            <p className="text-[10px] text-slate-400">Trusted</p>
          </div>
          <p className="text-2xl font-bold text-brand-purple">{trusted}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={13} className="text-yellow-400" />
            <p className="text-[10px] text-slate-400">Untrusted</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{untrusted}</p>
        </div>
      </div>

      {/* ── Security alert ── */}
      {untrusted > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/20"
        >
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-200">
            {untrusted} device{untrusted > 1 ? "s" : ""} not trusted. Review and
            trust or remove unknown devices.
          </p>
        </motion.div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-300">Registered Devices</p>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white border border-surface-border hover:bg-surface-border transition-all"
        >
          <RefreshCw size={11} className={cn(refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* ── Device list ── */}
      {devices.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          <Monitor size={32} className="mx-auto mb-3 opacity-30" />
          No devices registered.
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {devices.map((device) => {
            const icon = DEVICE_ICONS[device.device_type] ?? DEVICE_ICONS.other;
            const isOpen = expanded === device.id;
            const lastSeen = formatDistanceToNow(parseISO(device.last_seen), {
              addSuffix: true,
            });

            return (
              <motion.div
                key={device.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={cn(
                  "glass rounded-2xl overflow-hidden border transition-all",
                  !device.is_trusted
                    ? "border-yellow-400/20"
                    : device.is_online
                      ? "border-brand-green/10"
                      : "border-transparent",
                )}
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Icon + online dot */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        device.is_online
                          ? "bg-brand-green/10 text-brand-green"
                          : "bg-surface-secondary text-slate-500",
                      )}
                    >
                      {icon}
                    </div>
                    {device.is_online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-green border-2 border-bg-primary animate-pulse" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold text-white">
                        {device.name}
                      </p>
                      <div className="flex gap-1.5">
                        <Badge
                          variant={device.is_online ? "green" : "default"}
                          size="sm"
                        >
                          {device.is_online ? "Online" : "Offline"}
                        </Badge>
                        <Badge
                          variant={device.is_trusted ? "purple" : "warning"}
                          size="sm"
                        >
                          {device.is_trusted ? "Trusted" : "Unverified"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                      {device.os && (
                        <span className="flex items-center gap-1">
                          <Globe size={9} />
                          {device.os}
                        </span>
                      )}
                      {device.browser && <span>{device.browser}</span>}
                      {device.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={9} />
                          {device.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={9} />
                        Last seen {lastSeen}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleTrust(device)}
                      className={cn(
                        "p-1.5 rounded-lg text-sm transition-all",
                        device.is_trusted
                          ? "text-brand-purple hover:bg-brand-purple/10"
                          : "text-yellow-400 hover:bg-yellow-400/10",
                      )}
                    >
                      {device.is_trusted ? (
                        <Shield size={14} />
                      ) : (
                        <ShieldOff size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteDevice(device.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : device.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-white transition-all"
                    >
                      {isOpen ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-surface-border overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-4 px-5 py-4">
                        <DetailRow
                          label="Device Type"
                          value={device.device_type}
                        />
                        <DetailRow
                          label="IP Address"
                          value={device.ip_address ?? "—"}
                        />
                        <DetailRow label="OS" value={device.os ?? "—"} />
                        <DetailRow
                          label="Browser"
                          value={device.browser ?? "—"}
                        />
                        <DetailRow
                          label="Location"
                          value={device.location ?? "—"}
                        />
                        <DetailRow
                          label="Registered"
                          value={format(
                            parseISO(device.created_at),
                            "MMM d, yyyy",
                          )}
                        />
                        {device.latitude && device.longitude && (
                          <DetailRow
                            label="Coordinates"
                            value={`${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`}
                          />
                        )}
                        {device.session_token && (
                          <DetailRow
                            label="Session"
                            value={device.session_token.substring(0, 16) + "…"}
                          />
                        )}
                      </div>

                      {/* Trust action */}
                      {!device.is_trusted && (
                        <div className="px-5 pb-4 flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => toggleTrust(device)}
                          >
                            <Shield size={12} /> Trust This Device
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="!text-red-400 hover:!bg-red-400/10"
                            onClick={() => deleteDevice(device.id)}
                          >
                            <Trash2 size={12} /> Remove
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Security tips ── */}
      {devices.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={14} className="text-brand-cyan" />
            <p className="text-xs font-semibold text-white">
              Security Checklist
            </p>
          </div>
          <div className="space-y-2">
            {[
              { ok: untrusted === 0, text: "All devices are trusted" },
              {
                ok: devices.every((d) => d.ip_address !== null),
                text: "All devices have tracked IPs",
              },
              {
                ok: devices.filter((d) => d.is_online).length <= 3,
                text: "Reasonable number of active sessions",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.ok ? (
                  <CheckCircle2
                    size={12}
                    className="text-brand-green flex-shrink-0"
                  />
                ) : (
                  <AlertTriangle
                    size={12}
                    className="text-yellow-400 flex-shrink-0"
                  />
                )}
                <p className="text-xs text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 mb-0.5">{label}</p>
      <p className="text-xs text-white font-mono">{value}</p>
    </div>
  );
}
