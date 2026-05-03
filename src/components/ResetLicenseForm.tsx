"use client";

import { useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LICENSE_KEY_PATTERN = /^GGI-[A-Z0-9-]{8,25}$/;
const VERIFICATION_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export function ResetLicenseForm() {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLicenseKey = licenseKey.trim().toUpperCase();

    if (!EMAIL_PATTERN.test(normalizedEmail) || !LICENSE_KEY_PATTERN.test(normalizedLicenseKey)) {
      setError("Enter a valid email and license key.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/reset-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "request",
          email: normalizedEmail,
          licenseKey: normalizedLicenseKey
        })
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }

      setStep("verify");
      setMessage(data.message || "Verification code sent.");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = code.trim().toUpperCase();

    if (!VERIFICATION_CODE_PATTERN.test(normalizedCode)) {
      setError("Enter the 6-character verification code.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/reset-license", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "verify",
          email: email.trim().toLowerCase(),
          licenseKey: licenseKey.trim().toUpperCase(),
          code: normalizedCode
        })
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong. Please try again.");
      }

      setMessage(data.message || "Device lock reset complete.");
      setCode("");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={step === "request" ? handleRequest : handleVerify} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="reset-license-email" className="text-sm font-medium text-zinc-300">
              Email address
            </label>
            <input
              id="reset-license-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              disabled={loading || step === "verify"}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/40 focus:bg-black/45 disabled:opacity-80"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reset-license-key" className="text-sm font-medium text-zinc-300">
              License key
            </label>
            <input
              id="reset-license-key"
              type="text"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value.toUpperCase())}
              placeholder="GGI-XXXX-XXXX-XXXX"
              disabled={loading || step === "verify"}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/40 focus:bg-black/45 disabled:opacity-80"
            />
          </div>
        </div>

        {step === "verify" ? (
          <div className="space-y-2">
            <label htmlFor="reset-license-code" className="text-sm font-medium text-zinc-300">
              Verification code
            </label>
            <input
              id="reset-license-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm uppercase tracking-[0.2em] text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/40 focus:bg-black/45"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition duration-200 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? step === "request"
                ? "Sending code..."
                : "Resetting..."
              : step === "request"
                ? "Send Verification Code"
                : "Reset Device Lock"}
          </button>
          {step === "verify" ? (
            <button
              type="button"
              onClick={() => {
                setStep("request");
                setCode("");
                setError("");
                setMessage("");
              }}
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
            >
              Start over
            </button>
          ) : null}
        </div>
      </form>

      <div className="min-h-[28px] transition-all duration-200">
        {message ? (
          <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-7 text-emerald-200">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm leading-7 text-rose-300">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
