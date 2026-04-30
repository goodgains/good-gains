import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";

export default async function SuccessPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string; demo?: string }>;
}) {
  const { product, demo } = await searchParams;

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
