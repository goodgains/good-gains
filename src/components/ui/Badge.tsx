import { ReactNode } from "react";

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-300">
      {children}
    </span>
  );
}
