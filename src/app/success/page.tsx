import Link from "next/link";
import { bundle, bundleDeviceUpgrade } from "@/lib/products";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.success;

export default async function SuccessPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string; demo?: string }>;
}) {
  const { product, demo } = await searchParams;
  const isBundlePurchase = product?.trim().toLowerCase() === bundle.name.toLowerCase();

  return (
    <>
      <PageHero
        eyebrow="Checkout Success"
        title="Your payment was received"
        description="Your private delivery link is being prepared. PayPal Checkout now sends customers through the purchase capture flow, while this page remains available as a fallback confirmation screen."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-8">
            <h2 className="text-2xl font-semibold text-white">{product ? `Thank you for choosing ${product}.` : "Thank you for your purchase."}</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              {demo === "1"
                ? "You are seeing the local demo confirmation because live PayPal credentials are still pending."
                : "Customers should automatically move into the private download flow and receive an email with their license key and download link."}
            </p>
            {isBundlePurchase ? (
              <div className="mt-6 rounded-[1.9rem] border border-emerald-300/30 bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.18),_rgba(6,10,9,0.98)_60%)] p-7 shadow-[0_0_42px_rgba(74,222,128,0.14)]">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Bundle Upgrade</p>
                <h3 className="mt-3 text-3xl font-semibold text-white">Use your tools on 2 computers</h3>
                <p className="mt-3 max-w-2xl text-base leading-8 text-zinc-300">
                  Upgrade your license to 2 devices and trade from multiple setups.
                </p>
                <p className="mt-4 text-3xl font-semibold text-white">Upgrade now for ${bundleDeviceUpgrade.price}</p>
                <p className="mt-2 text-sm font-medium text-emerald-200">One-time upgrade. Keep the same license.</p>
                <div className="mt-6">
                  <Link
                    href="/license-activation"
                    className="inline-flex rounded-full bg-emerald-400 px-6 py-3.5 text-base font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.24)] transition hover:bg-emerald-300"
                  >
                    Upgrade to 2 Devices
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/license-activation" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
                View License Info
              </Link>
              <Link href="/downloads" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
                View Public Downloads
              </Link>
              <Link href="/products" className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white">
                Continue Shopping
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
