import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = pageMetadata.privacy;

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains the basic categories of customer information used to operate the Good Gains Indicators storefront."
    >
      <p>We collect customer email addresses and related purchase details to operate Good Gains Indicators services.</p>
      <p>Customer data may be used for product delivery, license verification, customer support, license recovery, and product update notifications.</p>
      <p>Payment information is processed by the payment providers used on this website and is not intended to be stored directly by Good Gains Indicators.</p>
      <p>We do not sell or share customer personal data with third parties for marketing purposes.</p>
      <p>Customer data is used only to operate Good Gains Indicators services, including access management, support, and update communication.</p>
      <p>Customers may contact <a href={`mailto:${siteConfig.supportEmail}`} className="text-emerald-300">{siteConfig.supportEmail}</a> to request help with account, delivery, or contact information issues.</p>
    </LegalPage>
  );
}
