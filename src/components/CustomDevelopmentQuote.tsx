"use client";

import { FormEvent, useMemo, useState } from "react";

const projectTypes = [
  {
    key: "indicator",
    label: "Indicator",
    title: "Indicator",
    description: "Custom chart-based indicators for signals, levels, and confirmations.",
    bullets: ["Signal and confirmation logic", "Clean chart overlays and levels", "Built for NinjaTrader 8 workflows"],
    price: "Starting from $199+"
  },
  {
    key: "strategy",
    label: "Automated Trading Strategy",
    title: "Automated Trading Strategy",
    description: "Fully automated systems that execute trades based on your rules.",
    bullets: ["Automatic entries and exits", "Built-in risk management", "Real-time execution"],
    price: "Starting from $799+"
  },
  {
    key: "panel",
    label: "Trade Management Tool",
    title: "Trade Management Tool",
    description: "Custom execution panels, dashboards, and workflow tools.",
    bullets: ["Faster execution workflows", "Clean control panels and dashboards", "Built around your trading process"],
    price: "Starting from $299+"
  },
  {
    key: "not-sure",
    label: "Not sure",
    title: "Not Sure Yet",
    description: "We help define the best solution based on your idea and workflow.",
    bullets: ["Clarify the right build path", "Scope features around your needs", "Get a practical quote quickly"],
    price: "Quoted after review"
  }
] as const;

export function CustomDevelopmentQuote() {
  const [selected, setSelected] = useState<(typeof projectTypes)[number]["key"]>("strategy");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [projectIdea, setProjectIdea] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeProject = useMemo(() => projectTypes.find((item) => item.key === selected) ?? projectTypes[0], [selected]);

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
          topic: `Custom development - ${activeProject.label}`,
          message: projectIdea
        })
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send your quote request.");
      }

      setSuccess(data.message || "Your quote request has been sent.");
      setProjectIdea("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send your quote request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="relative z-10 space-y-10 rounded-[2rem] border border-white/10 bg-zinc-950/75 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_24px_rgba(74,222,128,0.03)] pointer-events-auto">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Project Intake</p>
        <h2 className="text-3xl font-semibold text-white">What do you want to build?</h2>
        <p className="max-w-3xl text-base leading-8 text-zinc-400">
          Choose the closest fit and we&apos;ll guide the project from idea to working NinjaTrader build.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
          {[
            { step: "Step 1", label: "Selection" },
            { step: "Step 2", label: "What you'll get" },
            { step: "Step 3", label: "Form" }
          ].map((item) => (
          <div key={item.step} className="rounded-[1.5rem] border border-white/10 bg-black/25 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{item.step}</p>
            <p className="mt-2 text-sm font-semibold text-white">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {projectTypes.map((item) => {
          const isActive = item.key === selected;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSelected(item.key)}
              className={`rounded-[1.75rem] border p-5 text-left transition-all duration-300 ${
                isActive
                  ? "border-emerald-400/45 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),_rgba(0,0,0,0.96)_64%)] shadow-[0_0_28px_rgba(74,222,128,0.1)] opacity-100"
                  : "border-white/10 bg-black/30 opacity-60 hover:border-white/15 hover:bg-black/40 hover:opacity-82"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-lg font-semibold text-white">{item.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-7 transition-all duration-300">
          <div className="space-y-7">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">What you&apos;ll get</p>
              <h3 className="text-3xl font-semibold text-white">{activeProject.title}</h3>
              <p className="text-lg leading-8 text-zinc-100">{activeProject.description}</p>
            </div>

            <div className="grid gap-4">
              {activeProject.bullets.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4 text-base text-zinc-100">
                  <span className="font-medium text-white">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4">
              <p className="text-xl font-semibold text-emerald-300">{activeProject.price}</p>
            </div>
          </div>
        </div>

      <form onSubmit={handleSubmit} className="relative z-20 rounded-[1.75rem] border border-white/10 bg-black/35 p-6 pointer-events-auto">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Step 3: Form</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="relative z-20 rounded-2xl border border-white/15 bg-zinc-950/70 px-4 py-5 text-base text-zinc-400 pointer-events-auto">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="relative z-20 w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-500 pointer-events-auto"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </label>

          <label className="relative z-20 rounded-2xl border border-white/15 bg-zinc-950/70 px-4 py-5 text-base text-zinc-400 pointer-events-auto">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="relative z-20 w-full bg-transparent text-base text-white outline-none placeholder:text-zinc-500 pointer-events-auto"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="relative z-20 rounded-2xl border border-white/15 bg-zinc-950/70 px-4 py-5 text-base text-zinc-400 md:col-span-2 pointer-events-auto">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-zinc-500">Project idea</span>
            <textarea
              value={projectIdea}
              onChange={(event) => setProjectIdea(event.target.value)}
              className="relative z-20 min-h-28 w-full resize-y bg-transparent text-base leading-7 text-white outline-none placeholder:text-zinc-500 pointer-events-auto"
              placeholder="Tell us what you want to build."
              required
            />
          </label>
        </div>
        {error ? <p className="mt-4 text-sm leading-7 text-rose-300">{error}</p> : null}
        {success ? <p className="mt-4 text-sm leading-7 text-emerald-300">{success}</p> : null}
        <div className="mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="relative z-20 inline-flex items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-8 py-4.5 text-lg font-semibold text-black shadow-[0_0_38px_rgba(74,222,128,0.38)] transition duration-200 hover:-translate-y-1 hover:bg-emerald-200 hover:shadow-[0_0_48px_rgba(74,222,128,0.48)] disabled:cursor-not-allowed disabled:opacity-70 pointer-events-auto"
          >
            {submitting ? "Sending..." : "Get My Custom Quote"}
          </button>
          <p className="mt-4 text-base font-medium text-white">Start your custom build today</p>
          <p className="mt-2 text-sm font-medium text-zinc-200">Limited development slots available each month</p>
          <p className="mt-3 text-sm text-zinc-500">We usually respond within 24 hours</p>
        </div>
      </form>
    </section>
  );
}
