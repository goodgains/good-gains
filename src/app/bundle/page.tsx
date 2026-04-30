import { BundleCard } from "@/components/BundleCard";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { products } from "@/lib/products";

export default function BundlePage() {
  return (
    <>
      <PageHero
        eyebrow="Bundle Offer"
        title="Complete Trading System for Precision, Execution & Protection"
        supportLine="Stop guessing. Stop losing. Start trading with a complete system."
        description="Everything you need to trade with structure — enter better, execute faster, protect your profits, and understand the market context."
      />
      <section className="py-16 md:py-20">
        <Container className="space-y-10">
          <BundleCard showDetailsLink={false} showCoupon showTrustBadges showIntegratedBenefits />
          <div className="grid gap-6 lg:grid-cols-2">
            {products.map((product) => (
              <article key={product.slug} className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
                <h2 className="text-2xl font-semibold text-white">{product.name}</h2>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{product.shortDescription}</p>
                <p className="mt-3 text-base font-semibold text-white">{product.benefitLine}</p>
                <ul className="mt-5 space-y-3 text-sm text-zinc-300">
                  {product.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
