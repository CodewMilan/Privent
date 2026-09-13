"use client";

import { useEffect, useState } from "react";

export function LocalClock({ zone = "Asia/Kolkata", label = "IST" }: { zone?: string; label?: string }) {
  const [time, setTime] = useState("--:--");

  useEffect(() => {
    const tick = () => {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: zone,
        }).format(new Date()),
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [zone]);

  return (
    <span>
      {time} {label}
    </span>
  );
}
