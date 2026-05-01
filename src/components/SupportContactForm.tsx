"use client";

import { FormEvent, useMemo, useState } from "react";

type SupportContactFormProps = {
  selectedTopic?: string;
  supportEmail: string;
};

const topicOptions = [
  "Product question",
  "Bundle help",
  "License help",
  "Setup assistance",
  "Custom development",
  "Other"
];

export function SupportContactForm({ selectedTopic = "", supportEmail }: SupportContactFormProps) {
  const normalizedInitialTopic = useMemo(() => decodeURIComponent(selectedTopic || ""), [selectedTopic]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState(normalizedInitialTopic);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          message
        })
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send your message.");
      }

      setSuccess(data.message || "Your message has been sent.");
      setMessage("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send your message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            placeholder="Your name"
          />
        </label>

        <label className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            placeholder="you@example.com"
          />
        </label>

        <label className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Topic</span>
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none"
          >
            <option value="" className="bg-zinc-950 text-zinc-400">
              Select a topic
            </option>
            {topicOptions.map((option) => (
              <option key={option} value={option} className="bg-zinc-950 text-white">
                {option}
              </option>
            ))}
            {topic && !topicOptions.includes(topic) ? (
              <option value={topic} className="bg-zinc-950 text-white">
                {topic}
              </option>
            ) : null}
          </select>
        </label>

        <label className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4 text-sm text-zinc-300 min-h-32 md:col-span-2">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Message</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="min-h-28 w-full resize-y bg-transparent text-sm leading-7 text-white outline-none placeholder:text-zinc-500"
            placeholder="Tell us what you need help with."
          />
        </label>
      </div>

      {error ? <p className="text-sm leading-7 text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm leading-7 text-emerald-300">{success}</p> : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-zinc-400">
          Prefer direct email? Write to{" "}
          <a href={`mailto:${supportEmail}`} className="font-medium text-emerald-300">
            {supportEmail}
          </a>
          .
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
}
