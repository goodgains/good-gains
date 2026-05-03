import Link from "next/link";
import { BundleUpgradeCard } from "@/components/BundleUpgradeCard";
import { RecoverLicenseForm } from "@/components/RecoverLicenseForm";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";

export default async function RecoverLicensePage({
  searchParams
}: {
  searchParams?: Promise<{ upgrade?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const showUpgradeSuccess = resolvedSearchParams?.upgrade === "success";

  return (
    <>
      <PageHero
        eyebrow="License Recovery"
        title="Recover your license details"
        description="Enter the same email address used during checkout and we’ll send your license keys and private download links if a matching purchase exists."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
            <h2 className="text-2xl font-semibold text-white">Get your licenses by email</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              This works for single-product purchases and the full bundle. For security, we always send the details to the email address on the purchase.
            </p>
            <div className="mt-8">
              <RecoverLicenseForm />
            </div>
            {showUpgradeSuccess ? (
              <div className="mt-6 rounded-[1.5rem] border border-emerald-400/18 bg-emerald-400/5 px-5 py-4 text-sm font-medium text-emerald-200">
                Your bundle license was upgraded to 2 devices. Keep using the same license key.
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/support"
                className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
              >
                Contact Support
              </Link>
              <Link
                href="/products"
                className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
              >
                View Products
              </Link>
            </div>
          </div>
          <div className="mt-8">
            <BundleUpgradeCard />
          </div>
        </Container>
      </section>
    </>
  );
}
