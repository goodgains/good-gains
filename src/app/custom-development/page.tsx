import { CustomDevelopmentQuote } from "@/components/CustomDevelopmentQuote";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata.customDevelopment;

export default function CustomDevelopmentPage() {
  return (
    <>
      <PageHero
        eyebrow="Custom Development"
        title="Custom NinjaTrader 8 Development"
        description="Choose what you want to build, review the fit, and request a quote in one clean flow."
      />

      <section className="py-16 md:py-20">
        <Container>
          <CustomDevelopmentQuote />
        </Container>
      </section>
    </>
  );
}
