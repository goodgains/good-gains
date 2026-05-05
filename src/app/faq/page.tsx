import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { faqs } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.faq;

export default function FAQPage() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Common questions about Good Gains Indicators"
        description="Everything customers need to know about products, compatibility, licensing direction, and support."
      />
      <section className="py-16 md:py-20">
        <Container className="grid gap-5">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6">
              <h2 className="text-xl font-semibold text-white">{faq.question}</h2>
              <p className="mt-3 text-base leading-8 text-zinc-300">{faq.answer}</p>
            </article>
          ))}
        </Container>
      </section>
    </>
  );
}
