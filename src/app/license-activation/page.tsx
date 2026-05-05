import Link from "next/link";
import { BundleUpgradeCard } from "@/components/BundleUpgradeCard";
import { PageHero } from "@/components/PageHero";
import { RecoverLicenseForm } from "@/components/RecoverLicenseForm";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.licenseActivation;

const howItWorks = [
  "A unique license key",
  "Private download access",
  "Lifetime updates"
];

export default async function LicenseActivationPage({
  searchParams
}: {
  searchParams?: Promise<{ upgrade?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showUpgradeSuccess = resolvedSearchParams?.upgrade === "success";

  return (
    <>
      <PageHero
        eyebrow="License & Activation"
        title="License & Access Center"
        description="Manage your license, recover access, and get back to trading in seconds."
      />
      <section className="py-16 md:py-20">
        <Container className="space-y-8 md:space-y-10">
          <div className="rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.18),_rgba(0,0,0,0.94)_58%)] p-6 shadow-[0_0_32px_rgba(74,222,128,0.08)] md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  Recover License
                </p>
                <h2 className="text-3xl font-semibold text-white md:text-4xl">Lost your license?</h2>
                <p className="max-w-2xl text-base leading-8 text-zinc-300">
                  Enter your email and we&apos;ll instantly send you your license key and download access.
                  No waiting. No support needed.
                </p>
                <div className="rounded-[1.5rem] border border-white/10 bg-black/30 px-5 py-5">
                  <p className="text-sm font-medium text-zinc-200">Fast recovery, private access, and lifetime updates stay tied to your purchase email.</p>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-5 md:p-6">
                <RecoverLicenseForm />
                {showUpgradeSuccess ? (
                  <div className="mt-5 rounded-[1.5rem] border border-emerald-400/18 bg-emerald-400/5 px-5 py-4 text-sm font-medium text-emerald-200">
                    Your bundle license was upgraded to 2 devices. Keep using the same license key.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <BundleUpgradeCard />

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">How it works</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Everything stays linked to your purchase</h2>
              <p className="mt-3 text-base leading-8 text-zinc-300">
                After your purchase, you receive everything you need to install and activate your tools quickly.
              </p>
              <ul className="mt-6 grid gap-3">
                {howItWorks.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm text-zinc-200"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-7 text-zinc-400">
                Your license is securely linked to your email.
              </p>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Your access is safe</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">You&apos;re never locked out</h2>
              <p className="mt-3 text-base leading-8 text-zinc-300">
                Even if you lose your email or files, you can always recover your license using your email address.
              </p>
              <p className="mt-4 text-base leading-8 text-zinc-300">
                We&apos;ve built this system so you&apos;re never locked out.
              </p>
              <div className="mt-6 rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/5 px-5 py-5">
                <p className="text-sm font-medium text-emerald-100">
                  Recovery, downloads, and activation all stay tied to the same secure purchase record.
                </p>
              </div>
            </article>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Instant activation</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Unlock everything right away</h2>
              <p className="mt-3 text-base leading-8 text-zinc-300">
                Once your license is verified, all tools unlock immediately inside NinjaTrader.
              </p>
            </article>

            <article className="rounded-[2rem] border border-emerald-400/18 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.12),_rgba(0,0,0,0.94)_60%)] p-6 md:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Still need help?</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Support is one click away</h2>
              <p className="mt-3 max-w-2xl text-base leading-8 text-zinc-300">
                Contact our support team and we&apos;ll get you back up and running.
              </p>
              <div className="mt-6">
                <Link
                  href="/support"
                  className="inline-flex rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
                >
                  Contact Support
                </Link>
              </div>
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}
