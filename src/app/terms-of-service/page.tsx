import { LegalPage } from "@/components/LegalPage";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms outline the use of Good Gains Indicators products, digital delivery, and customer responsibilities."
    >
      <p>Good Gains Indicators provides downloadable software tools intended for use with NinjaTrader 8.</p>
      <p>Purchases grant a software usage license subject to the product terms communicated at checkout and during delivery.</p>
      <p>Customers may not redistribute, resell, reverse engineer, or share licensed product files unless explicitly authorized.</p>
      <p>We may update products, documentation, pricing, and support policies over time.</p>
    </LegalPage>
  );
}
