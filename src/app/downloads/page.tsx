import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";
import { bundleDownload, getDownloadByProductName, getDownloadProducts } from "@/lib/downloads";

export default async function DownloadsPage({
  searchParams
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const highlighted = getDownloadByProductName(product);
  const releases = getDownloadProducts();

  return (
    <>
      <PageHero
        eyebrow="Release Center"
        title="Latest versions and update notes"
        description="Customers receive a private download link after purchase by email. This page keeps the current version numbers and changelog visible without exposing the private delivery links."
        aside={
            <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">Private Delivery</p>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p>Each purchase gets a private download page.</p>
              <p>A license key is generated after successful payment.</p>
              <p>The email delivery includes the personal download link.</p>
            </div>
          </div>
        }
      />

      <section className="py-16">
        <Container className="space-y-10">
          {highlighted ? (
            <div className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/8 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">Current Release</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{highlighted.name}</h2>
              <p className="mt-2 text-sm text-zinc-300">
                The latest release for your selected product is highlighted below. Private downloads are sent by email after purchase.
              </p>
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            {releases.map(({ slug, name, shortDescription, release }) => {
              if (!release) return null;

              const isHighlighted = highlighted?.slug === slug;

              return (
                <article
                  key={slug}
                  className={`rounded-[2rem] border p-7 ${
                    isHighlighted
                      ? "border-emerald-400/30 bg-zinc-950 shadow-[0_0_36px_rgba(74,222,128,0.08)]"
                      : "border-white/10 bg-zinc-950/75"
                  }`}
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">Download</p>
                      <h2 className="text-2xl font-semibold text-white">{name}</h2>
                      <p className="max-w-xl text-sm leading-7 text-zinc-300">{shortDescription}</p>
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

                  <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/30 px-5 py-4 text-sm text-zinc-300">
                    Private download access is delivered after purchase. Current file: {release.fileName}
                  </div>

                  <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Update Notes</h3>
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
              );
            })}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">Bundle Download</p>
                <h2 className="text-3xl font-semibold text-white">{bundleDownload.name}</h2>
                <p className="text-sm leading-7 text-zinc-300">
                  Download the complete toolkit package with the latest versions of all included products in one file.
                </p>
                <p className="text-sm text-zinc-400">Version {bundleDownload.version} • Updated {bundleDownload.updatedAt}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-black/30 px-5 py-4 text-sm text-zinc-300">
                Bundle access is delivered privately after payment.
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-black/35 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Bundle Changelog</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-300">
                {bundleDownload.changelog.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-black/35 p-6 text-sm leading-7 text-zinc-300">
            <p className="font-semibold text-white">How updates work</p>
            <p className="mt-2">
              Customers return to their private download link for re-downloads. When a new version is ready, replace the latest package, update the version number, and refresh the notes here.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link href="/support" className="text-emerald-300 transition hover:text-emerald-200">
                Need installation help?
              </Link>
              <Link href="/license-activation" className="text-zinc-300 transition hover:text-white">
                View license and activation info
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

