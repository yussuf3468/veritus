import { cn } from "@/lib/utils";

/** Single shimmer block */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

/** 2–4 column stat card row */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-${count} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-4 space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      ))}
    </div>
  );
}

/** Card with icon + lines */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-4", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-full mt-3" />
        </div>
      </div>
    </div>
  );
}

/** Horizontal list rows */
export function SkeletonList({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl overflow-hidden", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-3 px-5 py-3",
            i !== 0 && "border-t border-surface-border",
          )}
        >
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Full-page skeleton for the dashboard */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-36" />
      </div>
      <SkeletonStats count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonList rows={5} />
          <SkeletonList rows={4} />
        </div>
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 rounded-xl" />
              ))}
            </div>
          </div>
          <SkeletonList rows={3} />
        </div>
      </div>
    </div>
  );
}
