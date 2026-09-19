"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock, remainingMs } from "@/lib/candidate/attempt";

type RemainingTimeProps = {
  expiresAt: string;
  serverNow: string;
  onExpire?: () => void;
};

export function RemainingTime({
  expiresAt,
  serverNow,
  onExpire,
}: RemainingTimeProps) {
  const [ms, setMs] = useState<number | null>(null);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    const syncedAt = performance.now();
    const tick = () =>
      setMs(remainingMs(expiresAt, serverNow, performance.now() - syncedAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, serverNow]);

  useEffect(() => {
    if (ms === null || ms > 0 || expiredRef.current) {
      return;
    }

    expiredRef.current = true;
    onExpireRef.current?.();
  }, [ms]);

  return (
    <p className="text-2xl font-semibold tabular-nums tracking-tight">
      {ms === null ? "—" : formatClock(ms)}
    </p>
  );
}
