"use client";

import { useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RecoverLicenseForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/recover-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: normalizedEmail
        })
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Unable to process license recovery.");
      }

      setMessage(data.message || "If this email exists, we’ll send your license details.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to process license recovery."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="recover-license-email" className="text-sm font-medium text-zinc-300">
          Purchase email
        </label>
        <input
          id="recover-license-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/40"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Sending..." : "Send my license details"}
      </button>
      {message ? <p className="text-sm leading-7 text-emerald-200">{message}</p> : null}
      {error ? <p className="text-sm leading-7 text-rose-300">{error}</p> : null}
    </form>
  );
}
