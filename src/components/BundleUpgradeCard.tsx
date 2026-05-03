"use client";

import { useMemo, useState } from "react";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BundleUpgradeCardProps = {
  defaultEmail?: string;
  defaultLicenseKey?: string;
  hideInputs?: boolean;
  compact?: boolean;
  prominent?: boolean;
};

export function BundleUpgradeCard({
  defaultEmail = "",
  defaultLicenseKey = "",
  hideInputs = false,
  compact = false,
  prominent = false
}: BundleUpgradeCardProps) {
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [licenseKey, setLicenseKey] = useState(defaultLicenseKey);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const normalizedEmail = useMemo(() => customerEmail.trim().toLowerCase(), [customerEmail]);
  const normalizedLicenseKey = useMemo(() => licenseKey.trim().toUpperCase(), [licenseKey]);

  async function handleUpgrade() {
    setError("");
    setSuccess("");

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError("Enter the same purchase email used for your bundle.");
      return;
    }

    if (!normalizedLicenseKey) {
      setError("Enter your current bundle license key.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout/bundle-upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          customerEmail: normalizedEmail,
          licenseKey: normalizedLicenseKey
        })
      });

      const data = (await response.json().catch(() => null)) as
        | {
            url?: string;
            error?: string;
            message?: string;
            alreadyUpgraded?: boolean;
          }
        | null;

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      if (data?.alreadyUpgraded) {
        setSuccess(data.message || "This bundle license already supports 2 devices.");
        return;
      }

      throw new Error(data?.error || data?.message || "Unable to start the 2-device upgrade.");
    } catch (upgradeError) {
      setError(upgradeError instanceof Error ? upgradeError.message : "Unable to start the 2-device upgrade.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`rounded-[1.9rem] border ${
        prominent ? "border-emerald-300/30 bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.18),_rgba(6,10,9,0.98)_60%)] shadow-[0_0_48px_rgba(74,222,128,0.14)]" : "border-emerald-400/18 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),_rgba(0,0,0,0.92)_62%)]"
      } ${
        compact ? "p-5 md:p-6" : prominent ? "p-7 md:p-8" : "p-6 md:p-7"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Bundle Upgrade</p>
      <h3 className={`mt-3 font-semibold text-white ${compact ? "text-2xl" : prominent ? "text-[2.35rem] leading-tight" : "text-3xl"}`}>
        Use your tools on 2 computers
      </h3>
      <p className="mt-3 max-w-2xl text-base leading-8 text-zinc-300">
        Upgrade your license to 2 devices and trade from multiple setups.
      </p>
      <p className={`mt-4 font-semibold text-white ${prominent ? "text-3xl md:text-[2.6rem]" : "text-2xl"}`}>Upgrade now for $149</p>
      <p className="mt-2 text-sm font-medium text-emerald-200">One-time upgrade. Keep the same license.</p>

      {hideInputs ? (
        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/35 px-4 py-4 text-sm leading-7 text-zinc-300">
          We&apos;ll keep your current bundle license key and simply unlock a second device after payment completes.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="bundle-upgrade-email" className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Purchase Email
            </label>
            <input
              id="bundle-upgrade-email"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/35"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="bundle-upgrade-license" className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
              Bundle License Key
            </label>
            <input
              id="bundle-upgrade-license"
              type="text"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value.toUpperCase())}
              placeholder="GGI-XXXX-XXXX-XXXX"
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/35"
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className={`inline-flex items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.24)] transition hover:-translate-y-0.5 hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-70 ${
            prominent ? "px-7 py-3.5 text-base" : "px-6 py-3 text-sm"
          }`}
        >
          {loading ? "Starting upgrade..." : "Upgrade to 2 Devices"}
        </button>
        <p className="text-sm leading-7 text-zinc-400">One-time upgrade. Keep the same license.</p>
      </div>

      {success ? <p className="mt-4 text-sm font-medium text-emerald-200">{success}</p> : null}
      {error ? <p className="mt-4 text-sm font-medium text-rose-300">{error}</p> : null}
    </div>
  );
}
