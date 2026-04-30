import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains the basic categories of customer information used to operate the Good Gains Indicators storefront."
    >
      <p>We may collect purchase, contact, and support-related information necessary to fulfill orders and assist customers.</p>
      <p>Payment information is processed through PayPal Checkout and is not intended to be stored directly by this site.</p>
      <p>Future licensing workflows may use customer email, product information, machine identifiers, and activation status to verify product access.</p>
      <p>Customers may contact support to request updates to stored contact information where applicable.</p>
    </LegalPage>
  );
}
