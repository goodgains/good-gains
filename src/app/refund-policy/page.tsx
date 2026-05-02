import { LegalPage } from "@/components/LegalPage";
import { siteConfig } from "@/lib/site";

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      description="This page explains how Good Gains Indicators handles refund requests for digital software products."
    >
      <p>Due to the digital nature of our products, all sales are final once the product has been delivered.</p>
      <p>We do not offer refunds after license delivery and download access have been provided.</p>
      <p>However, if a customer experiences technical issues, they should contact support and we will assist them as quickly as possible.</p>
      <p>In exceptional cases, refunds may be granted at our discretion.</p>
      <p>Support email: <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-300">{siteConfig.supportEmail}</a></p>
    </LegalPage>
  );
}
