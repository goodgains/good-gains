import { PageHero } from "@/components/PageHero";
import { SupportContactForm } from "@/components/SupportContactForm";
import { SupportMessagePanel } from "@/components/SupportMessagePanel";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site";

export default async function SupportPage({
  searchParams
}: {
  searchParams: Promise<{ topic?: string; service?: string }>;
}) {
  const params = await searchParams;
  const selectedTopic = params.service ?? params.topic ?? "";

  return (
    <>
      <PageHero
        eyebrow="Support"
        title="Support that keeps traders moving"
        description="Fast trader support, easy setup assistance, and post-purchase help for active NinjaTrader traders."
      />
      <section className="py-16 md:py-20">
        <div id="support-overview" data-support-nav="support" className="scroll-mt-28 space-y-10">
          <Container className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Fast trader support",
                description: "Get quick help with product questions, workflow guidance, and practical trading-tool usage."
              },
              {
                title: "Easy setup assistance",
                description: "Get guidance for NinjaTrader 8 setup, imports, indicator placement, and getting started quickly."
              },
              {
                title: "Post-purchase help available",
                description: "Ask about licensing, configuration, product usage, or which tools fit your workflow best."
              }
            ].map((item) => (
              <article key={item.title} className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-4 text-sm leading-7 text-zinc-400">{item.description}</p>
              </article>
            ))}
          </Container>

          <Container>
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-8">
              <h2 className="text-2xl font-semibold text-white">Direct support contact</h2>
              <p className="mt-4 text-base leading-8 text-zinc-300">
                Email{" "}
                <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-300">
                  {siteConfig.supportEmail}
                </a>{" "}
                for help.
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-200">Support response time: within 24 hours.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm font-semibold text-white">License, delivery, and setup help</p>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">Reach out for license recovery, NinjaTrader 8 installation questions, or help accessing your downloads.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Product updates included</p>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">We can help with update notifications, reinstalling purchased tools, and getting you back up and running quickly.</p>
                </div>
              </div>
              <a href="#message-form" className="mt-6 inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
                Contact support
              </a>
            </div>
          </Container>
        </div>

        <Container className="mt-10">
          <SupportMessagePanel>
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Send message</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Tell us what you need</h2>
                <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-300">
                  Reach out for product questions, bundle help, licensing, setup assistance, or a custom build conversation.
                </p>
              </div>
              {selectedTopic ? (
                <div className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                  Topic: {decodeURIComponent(selectedTopic)}
                </div>
              ) : null}
            </div>
            <SupportContactForm selectedTopic={selectedTopic} supportEmail={siteConfig.supportEmail} />
          </SupportMessagePanel>
        </Container>
      </section>
    </>
  );
}

