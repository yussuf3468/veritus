"use client";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type Table = "devices" | "tasks" | "habits" | "habit_completions";

interface Options {
  table: Table;
  userId: string;
  onInsert?: (payload: unknown) => void;
  onUpdate?: (payload: unknown) => void;
  onDelete?: (payload: unknown) => void;
}

export function useRealtime({
  table,
  userId,
  onInsert,
  onUpdate,
  onDelete,
}: Options) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    channelRef.current = supabase
      .channel(`realtime_${table}_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onInsert?.(payload.new),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onUpdate?.(payload.new),
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table,
          filter: `user_id=eq.${userId}`,
        },
        (payload) => onDelete?.(payload.old),
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [table, userId, onInsert, onUpdate, onDelete]);
}
