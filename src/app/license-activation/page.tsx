import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";

export default function LicenseActivationPage() {
  return (
    <>
      <PageHero
        eyebrow="License & Activation"
        title="Current license delivery overview and future activation roadmap"
        description="This page explains the present purchase flow and documents the placeholder structure for the future automated license system."
      />
      <section className="py-16 md:py-20">
        <Container className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Current workflow</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-zinc-300">
                <li>Customers receive a license key after purchase.</li>
                <li>Products are built for NinjaTrader 8.</li>
                <li>PayPal Checkout handles payments before license delivery and private download access are created.</li>
              </ul>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-2xl font-semibold text-white">Planned verification support</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-zinc-300">
                <li>Product key</li>
                <li>Customer email</li>
                <li>Machine ID</li>
                <li>Active or blocked status</li>
                <li>Expiration handling</li>
              </ul>
            </article>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.14),_rgba(0,0,0,0.94)_55%)] p-6">
            <h2 className="text-2xl font-semibold text-white">Future license system notes</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                "API endpoint: /api/verify-license",
                "License fields: license key, email, product, machine ID, status, expiration",
                "Admin panel can be added later",
                "NinjaTrader 8 indicators will validate license before running"
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-4 text-sm text-zinc-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
