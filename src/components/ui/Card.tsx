import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: "cyan" | "purple" | "green" | false;
  hover?: boolean;
}

export function Card({
  children,
  className,
  glow = false,
  hover = false,
}: CardProps) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5",
        hover && "glass-hover cursor-pointer transition-all duration-200",
        glow === "cyan" && "glow-cyan",
        glow === "purple" && "glow-purple",
        glow === "green" && "glow-green",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: string;
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  trendValue,
  color = "#00d4ff",
}: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          {trend && trendValue && (
            <span
              className={cn(
                "text-xs mt-1 inline-block",
                trend === "up" && "text-brand-green",
                trend === "down" && "text-red-400",
                trend === "neutral" && "text-slate-400",
              )}
            >
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </span>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center opacity-80"
            style={{ background: `${color}18`, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
