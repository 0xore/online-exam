"use client";

import { useEffect, useState } from "react";
import { syncCandidateAttemptAction } from "@/app/e/[slug]/sit/actions";

type ServerClock = {
  expiresAt: string;
  serverNow: string;
};

export function useServerClock(
  slug: string,
  initial: ServerClock,
  locked: boolean,
  onLocked: () => void,
) {
  const [clock, setClock] = useState(initial);

  useEffect(() => {
    setClock(initial);
  }, [initial.expiresAt, initial.serverNow]);

  useEffect(() => {
    if (locked) {
      return;
    }

    let cancelled = false;

    async function beat() {
      const result = await syncCandidateAttemptAction(slug);
      if (cancelled || !result.ok) {
        return;
      }

      if (result.expiresAt && result.serverNow) {
        setClock({
          expiresAt: result.expiresAt,
          serverNow: result.serverNow,
        });
      }

      if (result.locked) {
        onLocked();
      }
    }

    const id = window.setInterval(() => {
      void beat();
    }, 20_000);

    function onVisible() {
      if (document.visibilityState === "visible") {
        void beat();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [locked, onLocked, slug]);

  return clock;
}
