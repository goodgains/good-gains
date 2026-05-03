import Link from "next/link";
import { ResetLicenseForm } from "@/components/ResetLicenseForm";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";

export default function ResetLicensePage() {
  return (
    <>
      <PageHero
        eyebrow="Device Reset"
        title="Reset your device lock"
        description="Verify ownership of your license, clear the active device list, and get back into NinjaTrader without opening a support ticket."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
            <h2 className="text-2xl font-semibold text-white">Move your license to a new device</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              Enter the purchase email and license key first. We&apos;ll send a short verification code,
              then clear the saved device list after you confirm it.
            </p>
            <div className="mt-8">
              <ResetLicenseForm />
            </div>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/recover-license"
                className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
              >
                Recover License
              </Link>
              <Link
                href="/support"
                className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
