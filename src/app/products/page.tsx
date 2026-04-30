import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { ProductCard } from "@/components/ProductCard";
import { Container } from "@/components/ui/Container";
import { products } from "@/lib/products";

export default function ProductsPage() {
  return (
    <>
      <PageHero
        eyebrow="Indicators & Tools"
        title="A premium NinjaTrader 8 product lineup for futures traders"
        description="Explore every Good Gains product, compare use cases, and choose the right workflow upgrade for your desk."
      />
      <section className="py-16 md:py-20">
        <Container className="space-y-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-emerald-400/20 bg-zinc-950/75 px-8 py-12 text-center shadow-[0_0_24px_rgba(74,222,128,0.06)] md:px-10 md:py-14">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">Most traders choose the complete system</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-300">
              Instead of choosing one tool, get everything you need for entries, execution, discipline, and market structure in one system.
            </p>
            <div className="mt-6">
              <Link
                href="/bundle"
                className="inline-flex items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-7 py-4 text-base font-semibold text-black shadow-[0_0_34px_rgba(74,222,128,0.34)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_44px_rgba(74,222,128,0.44)]"
              >
                Get the Full Trading System – Save $247
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
