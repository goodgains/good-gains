import { redirect } from "next/navigation";
import { PaddleCheckoutClient } from "@/components/PaddleCheckoutClient";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { getBaseUrl } from "@/lib/base-url";
import { getPaddleClientToken, getPaddleEnvironment, isPaddleConfigured } from "@/lib/paddle";

export default async function PaddleCheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ transaction_id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const transactionId = resolvedSearchParams.transaction_id?.trim();

  if (!transactionId || !isPaddleConfigured()) {
    redirect("/cancel");
  }

  const clientToken = getPaddleClientToken();

  if (!clientToken) {
    redirect("/cancel");
  }

  const baseUrl = getBaseUrl();

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title="Secure card checkout"
        description="Finish your order with Paddle. After payment, we’ll send your license key and open your private downloads automatically."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <PaddleCheckoutClient
            transactionId={transactionId}
            clientToken={clientToken}
            environment={getPaddleEnvironment()}
            successUrl={`${baseUrl}/api/paddle/success?transaction_id=${encodeURIComponent(transactionId)}`}
            cancelUrl={`${baseUrl}/cancel`}
          />
        </Container>
      </section>
    </>
  );
}
