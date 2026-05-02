import type { Route } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/lib/site";

const legalLinks: { href: Route; label: string }[] = [
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/risk-disclaimer", label: "Risk Disclaimer" },
  { href: "/recover-license", label: "Recover License" }
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <Container className="space-y-10 py-12">
        <div className="grid gap-8 md:grid-cols-[1.6fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="inline-flex">
              <BrandLogo variant="full" />
            </div>
            <p className="max-w-xl text-sm leading-7 text-zinc-400">{siteConfig.description}</p>
            <p className="max-w-xl text-sm leading-7 text-zinc-500">{siteConfig.disclaimer}</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">Explore</h4>
            <div className="flex flex-col gap-3 text-sm text-zinc-300">
              <Link href="/products">Indicators</Link>
              <Link href="/pricing">Pricing</Link>
              <Link href="/bundle">Bundle Offer</Link>
              <Link href="/downloads">Downloads</Link>
              <Link href="/custom-development">Custom Development</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/support">Support</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">Legal</h4>
            <div className="flex flex-col gap-3 text-sm text-zinc-300">
              {legalLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <div className="space-y-1 text-right">
            <p>{siteConfig.supportEmail}</p>
            <p className="text-xs text-zinc-600">Support response time: within 24 hours.</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}

