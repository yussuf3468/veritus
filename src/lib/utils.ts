import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolveCurrencyCode(currency?: string | null): string {
  const normalized = currency?.trim().toUpperCase();

  if (!normalized || normalized === "USD" || normalized === "KSH") {
    return "KES";
  }

  return normalized;
}

export function getCurrencyLocale(currency?: string | null): string {
  return resolveCurrencyCode(currency) === "KES" ? "en-KE" : "en-US";
}

export function getCurrencyLabel(currency?: string | null): string {
  const resolved = resolveCurrencyCode(currency);
  return resolved === "KES" ? "KSh" : resolved;
}

export function formatCurrency(amount: number, currency = "KES"): string {
  const resolvedCurrency = resolveCurrencyCode(currency);
  return new Intl.NumberFormat(getCurrencyLocale(resolvedCurrency), {
    style: "currency",
    currency: resolvedCurrency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d, yyyy");
}

export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatShortDate(date: string | Date): string {
  return format(typeof date === "string" ? new Date(date) : date, "MMM d");
}

export function getPriorityColor(priority: string): string {
  return (
    {
      low: "text-brand-green  border-brand-green/30  bg-brand-green/10",
      medium: "text-brand-cyan   border-brand-cyan/30   bg-brand-cyan/10",
      high: "text-brand-orange border-brand-orange/30 bg-brand-orange/10",
      urgent: "text-red-400      border-red-400/30      bg-red-400/10",
    }[priority] ?? "text-slate-400 border-slate-400/30 bg-slate-400/10"
  );
}

export function getStatusColor(status: string): string {
  return (
    {
      pending: "text-slate-400  bg-slate-400/10",
      in_progress: "text-brand-cyan bg-brand-cyan/10",
      completed: "text-brand-green bg-brand-green/10",
      cancelled: "text-red-400    bg-red-400/10",
      active: "text-brand-cyan bg-brand-cyan/10",
      paused: "text-yellow-400 bg-yellow-400/10",
    }[status] ?? "text-slate-400 bg-slate-400/10"
  );
}

export function truncate(str: string, length = 80): string {
  return str.length > length ? str.slice(0, length) + "…" : str;
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getDeviceTypeIcon(type: string): string {
  return (
    { laptop: "💻", phone: "📱", tablet: "📟", desktop: "🖥️", other: "📡" }[
      type
    ] ?? "📡"
  );
}

/** Rate-limit helper: returns true if allowed */
const rateLimitMap = new Map<string, number[]>();
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const times = (rateLimitMap.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= max) return false;
  times.push(now);
  rateLimitMap.set(key, times);
  return true;
}
