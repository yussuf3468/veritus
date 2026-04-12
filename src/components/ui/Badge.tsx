import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "cyan"
    | "green"
    | "orange"
    | "red"
    | "purple"
    | "warning";
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  default: "text-slate-400  bg-slate-400/10  border-slate-400/20",
  cyan: "text-brand-cyan  bg-brand-cyan/10  border-brand-cyan/20",
  green: "text-brand-green bg-brand-green/10 border-brand-green/20",
  orange: "text-brand-orange bg-brand-orange/10 border-brand-orange/20",
  red: "text-red-400    bg-red-400/10    border-red-400/20",
  purple: "text-brand-purple bg-brand-purple/10 border-brand-purple/20",
  warning: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

const sizes = {
  sm: "px-1.5 py-px text-[10px]",
  md: "px-2    py-0.5 text-xs",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md border",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
