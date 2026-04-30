import Link from "next/link";
import { redirect } from "next/navigation";
import { DownloadAccessPolling } from "@/components/DownloadAccessPolling";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { getValidatedDeliveryBySessionId } from "@/lib/delivery";

export default async function DownloadAccessPage({
  searchParams
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (sessionId) {
    const record = await getValidatedDeliveryBySessionId(sessionId);

    if (record) {
      redirect(`/downloads/${record.token}`);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Preparing Delivery"
        title="Your private download page is being prepared"
        description="PayPal has returned successfully. We are checking your completed payment and preparing your private download access."
      />
      <section className="py-16">
        <Container className="max-w-3xl">
          <DownloadAccessPolling />
          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
            <h2 className="text-2xl font-semibold text-white">Almost ready</h2>
            <p className="mt-4 text-base leading-8 text-zinc-300">
              This page refreshes automatically every few seconds. As soon as payment capture and delivery finish, you will be taken directly to your private download page.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/support" className="rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
                Contact Support
              </Link>
              <Link href="/products" className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white">
                Back to Products
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
