"use client";

import { useEffect, useState } from "react";

export function SupportMessagePanel({ children }: { children: React.ReactNode }) {
  const [highlighted, setHighlighted] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const triggerHighlight = () => {
      if (window.location.hash !== "#message-form") {
        return;
      }

      setHighlighted(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setHighlighted(false);
      }, 1800);
    };

    triggerHighlight();
    window.addEventListener("hashchange", triggerHighlight);

    return () => {
      window.removeEventListener("hashchange", triggerHighlight);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div
      id="message-form"
      data-support-nav="contact"
      className={`scroll-mt-28 rounded-[2rem] border p-6 transition-all duration-500 ${
        highlighted
          ? "border-emerald-400/35 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),rgba(0,0,0,0.92)_70%)] shadow-[0_0_30px_rgba(74,222,128,0.12)]"
          : "border-white/10 bg-black/40"
      }`}
    >
      {children}
    </div>
  );
}
