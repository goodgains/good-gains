import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";

export default function CancelPage() {
  return (
    <>
      <PageHero
        eyebrow="Checkout Canceled"
        title="Your checkout was canceled"
        description="Customers can return to pricing or product pages and restart checkout whenever they are ready."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-8">
            <p className="text-base leading-8 text-zinc-300">
              No charge was completed from this flow. You can compare products, review the bundle, or contact support before purchasing.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/pricing" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
                Return to Pricing
              </Link>
              <Link href="/support#message-form" className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white">
                Contact Support
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
