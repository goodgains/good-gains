import { PageHero } from "@/components/PageHero";
import { SupportContactForm } from "@/components/SupportContactForm";
import { SupportMessagePanel } from "@/components/SupportMessagePanel";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata.contact;

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Contact Good Gains Indicators"
        description="Ask about NinjaTrader 8 indicators, product setup, license access, bundle options, or custom trading tools."
      />
      <section className="py-16 md:py-20">
        <Container>
          <SupportMessagePanel>
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Send message</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Tell us what you need</h2>
                <p className="mt-3 max-w-3xl text-base leading-8 text-zinc-300">
                  Reach out for product questions, NinjaTrader 8 setup help, licensing, bundle guidance, or a custom build conversation.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                <p className="text-sm font-semibold text-white">Direct email</p>
                <a href={`mailto:${siteConfig.supportEmail}`} className="mt-2 inline-flex text-sm text-emerald-300">
                  {siteConfig.supportEmail}
                </a>
              </div>
            </div>
            <SupportContactForm selectedTopic="" supportEmail={siteConfig.supportEmail} />
          </SupportMessagePanel>
        </Container>
      </section>
    </>
  );
}
