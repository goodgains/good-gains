"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DownloadAccessGate({ token }: { token: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/download-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: normalizedEmail })
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
        redirectUrl?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to verify access.");
      }

      const targetUrl = data.redirectUrl || `/downloads/${token}`;

      window.setTimeout(() => {
        window.location.href = targetUrl;
      }, 100);

      window.setTimeout(() => {
        try {
          router.push(targetUrl);
        } catch {
          window.location.reload();
        }
      }, 0);

      window.setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify access.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="download-email" className="text-sm font-medium text-white">
          Email used during payment
        </label>
        <input
          id="download-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400/40"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Verifying..." : "Unlock Download Access"}
      </button>
      {error ? <p className="text-sm leading-6 text-rose-300">{error}</p> : null}
    </form>
  );
}

