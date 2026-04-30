"use client";

import { useState } from "react";

export function CopyTextButton({
  text,
  label = "Copy",
  copiedLabel = "Copied"
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-white/25 hover:text-white"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
