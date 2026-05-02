import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms outline the use of Good Gains Indicators products, digital delivery, and customer responsibilities."
    >
      <p>All products sold on this website are digital software tools delivered electronically.</p>
      <p>Customers are granted a non-transferable, non-exclusive license to use the purchased software for their own trading workflow.</p>
      <p>Reselling, sharing, distributing, copying, or reverse engineering any product, license key, DLL, export ZIP, or related delivery file is strictly prohibited.</p>
      <p>All tools are built for NinjaTrader 8 and require the NinjaTrader 8 platform to install and use.</p>
      <p>Purchase and delivery grant software access only. No product on this website represents financial advice, trading signals, or guaranteed trading results.</p>
      <p>We may update products, documentation, support procedures, and compliance language over time. Continued use of the software remains subject to the latest published terms on this website.</p>
      <p>For support, contact <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-300">{siteConfig.supportEmail}</a>.</p>
    </LegalPage>
  );
}
