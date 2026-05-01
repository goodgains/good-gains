import { cookies } from "next/headers";
import { CopyTextButton } from "@/components/CopyTextButton";
import { PageHero } from "@/components/PageHero";
import { DownloadAccessGate } from "@/components/DownloadAccessGate";
import { Container } from "@/components/ui/Container";
import {
  DOWNLOAD_ACCESS_COOKIE,
  getDeliveryDownloadData,
  getValidatedDeliveryByToken,
  hasTemporaryUnlockAccess,
  hasDownloadAccess
} from "@/lib/delivery";

export default async function PrivateDownloadPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ unlock?: string }>;
}) {
  const { token } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const record = await getValidatedDeliveryByToken(token);

  if (!record) {
    return (
      <>
        <PageHero
          eyebrow="Download Access"
          title="This link is invalid or expired"
          description="Your private download link could not be verified. Return to pricing or contact support if you believe this is a mistake."
        />
        <section className="py-16">
          <Container className="max-w-3xl">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
              <a href="/pricing" className="inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
                Return to Pricing
              </a>
            </div>
          </Container>
        </section>
      </>
    );
  }

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(DOWNLOAD_ACCESS_COOKIE)?.value;
  const hasAccess =
    hasDownloadAccess(record, accessCookie) ||
    hasTemporaryUnlockAccess(record, resolvedSearchParams?.unlock);

  if (!hasAccess) {
    return (
      <>
        <PageHero
          eyebrow="Private Download Page"
          title="Verify your purchase email to unlock downloads"
          description="For security, this private link only opens after you confirm the same email address used during payment."
        />
        <section className="py-16">
          <Container className="max-w-3xl">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">Access check required</h2>
                <p className="text-base leading-8 text-zinc-300">
                  Enter the customer email used during checkout. This helps prevent shared links from opening freely on other devices.
                </p>
                <p className="text-sm text-zinc-400">
                  Link expires: {record.expiresAt ? new Date(record.expiresAt).toLocaleString("en-US") : "No expiration"}
                </p>
              </div>
              <div className="mt-8">
                <DownloadAccessGate token={token} />
              </div>
            </div>
          </Container>
        </section>
      </>
    );
  }

  const { releases, hasBundlePurchase } = getDeliveryDownloadData(record);
  const activationSupportText = hasBundlePurchase
    ? "This same license key activates all four included Good Gains tools."
    : "Keep this key safe. Your purchase is linked to this license key.";
  const deliverySteps = [
    {
      step: "Step 1",
      title: "Download",
      text: hasBundlePurchase
        ? "Download each included ZIP from this page so you can install every tool separately."
        : "Download your latest ZIP file from this page."
    },
    {
      step: "Step 2",
      title: "Import into NinjaTrader 8",
      text: "Use Tools > Import > NinjaScript Add-On to bring the file into NinjaTrader."
    },
    {
      step: "Step 3",
      title: "Activate with license key",
      text: hasBundlePurchase
        ? "Use the same license key shown here to activate each included tool."
        : "Use the license key shown here when the activation prompt appears."
    }
  ];

  return (
    <>
      <PageHero
        eyebrow="Private Download Page"
        title="🎉 You&apos;re all set!"
        description="Your tools are ready to download. Everything below is tied to your completed purchase and private license access."
        aside={
          <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/85 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">License Key</p>
            <p className="mt-4 break-all rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-[1.65rem] font-semibold tracking-[0.03em] text-white md:text-[1.85rem]">
              {record.licenseKey}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <CopyTextButton text={record.licenseKey} label="Copy License" copiedLabel="Copied" />
            </div>
            <p className="mt-4 text-sm leading-7 text-zinc-300">{activationSupportText}</p>
            <p className="mt-2 text-sm font-medium text-emerald-200">Lifetime updates + ongoing improvements</p>
          </div>
        }
      />

      <section className="py-16">
        <Container className="space-y-10">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Delivery Dashboard</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Your tools are ready to download</h2>
              <p className="mt-3 max-w-2xl text-base leading-8 text-zinc-300">
                Download your latest files, copy your license key, and follow the quick setup steps below to get everything running inside NinjaTrader 8.
              </p>
              <p className="mt-3 text-sm font-medium text-emerald-200">
                {hasBundlePurchase ? "One bundle purchase. Four separate product downloads." : "You now have full access to the Good Gains system"}
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {hasBundlePurchase ? "This same license key is ready to activate all four included tools." : "Your license is now active and ready to use"}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <CopyTextButton text={record.licenseKey} label="Copy License" copiedLabel="Copied" />
                <span className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-100">
                  Installation guide coming soon
                </span>
                <a
                  href="/support"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-white/25 hover:text-white"
                >
                  Contact support
                </a>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {deliverySteps.map((item) => (
                  <div key={item.step} className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">{item.step}</p>
                    <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-300">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-6 text-sm leading-7 text-zinc-300">
              <p>
                <span className="text-zinc-500">Customer:</span> {record.customerEmail}
              </p>
              <p>
                <span className="text-zinc-500">Issued:</span> {new Date(record.createdAt).toLocaleString("en-US")}
              </p>
              <p>
                <span className="text-zinc-500">Access expires:</span>{" "}
                {record.expiresAt ? new Date(record.expiresAt).toLocaleString("en-US") : "No expiration"}
              </p>
              <p>
                <span className="text-zinc-500">Downloads remaining:</span> {Math.max(record.maxDownloads - record.downloadCount, 0)}
              </p>
              <div className="mt-6 rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/5 p-5">
                <p className="text-sm font-semibold text-white">Good to know</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-300">
                  <li>Lifetime updates included.</li>
                  <li>You can return to this page anytime while access remains valid.</li>
                  <li>Your purchase is securely linked to this license key and customer email.</li>
                </ul>
              </div>
            </div>
          </div>

          {hasBundlePurchase ? (
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Bundle Access</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Your bundle includes four separate downloads</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-300">
                  Download each tool individually below. Your single bundle license key works across GG RR Trade Panel, GG Daily Account Lock AddOn, GG Session High/Low Indicator, and GG SMI Precision.
                </p>
                <p className="mt-3 text-sm font-medium text-emerald-200">No combined bundle ZIP is required.</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]" id="install-guide">
            {releases.map(({ slug, product, release }) => (
              <article key={slug} className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">Product Download</p>
                    <h2 className="text-2xl font-semibold text-white">{product.name}</h2>
                    <p className="max-w-xl text-sm leading-7 text-zinc-300">{product.shortDescription}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-300">
                    <p>
                      <span className="text-zinc-500">Version:</span> <span className="font-semibold text-white">{release.version}</span>
                    </p>
                    <p className="mt-1">
                      <span className="text-zinc-500">Updated:</span> {release.updatedAt}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-2">
                    <a
                      href={`/api/download/${record.token}/${slug}`}
                      download
                      className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
                    >
                      Download {product.name}
                    </a>
                    <p className="text-sm text-zinc-300">{release.fileName}</p>
                  </div>
                </div>

                <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Installation</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-300">
                    {release.installNotes.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Changelog</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-300">
                    {release.changelog.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
