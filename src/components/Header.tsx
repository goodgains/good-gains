"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Container } from "@/components/ui/Container";

const links: { href: Route; label: string; section?: "support" | "contact" }[] = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/pricing", label: "Pricing" },
  { href: "/bundle", label: "Bundle" },
  { href: "/custom-development", label: "Custom Development" },
  { href: "/faq", label: "FAQ" },
  { href: "/support", label: "Support", section: "support" },
  { href: "/support#message-form" as Route, label: "Contact", section: "contact" }
];

export function Header() {
  const pathname = usePathname();
  const [supportSection, setSupportSection] = useState<"support" | "contact">("support");

  useEffect(() => {
    if (pathname !== "/support") {
      return;
    }

    const supportEl = document.getElementById("support-overview");
    const contactEl = document.getElementById("message-form");

    if (!supportEl || !contactEl) {
      return;
    }

    const setFromHash = () => {
      setSupportSection(window.location.hash === "#message-form" ? "contact" : "support");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]?.target === contactEl) {
          setSupportSection("contact");
          return;
        }

        if (visibleEntries[0]?.target === supportEl) {
          setSupportSection("support");
        }
      },
      {
        threshold: [0.2, 0.4, 0.6],
        rootMargin: "-120px 0px -35% 0px"
      }
    );

    observer.observe(supportEl);
    observer.observe(contactEl);
    setFromHash();
    window.addEventListener("hashchange", setFromHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", setFromHash);
    };
  }, [pathname]);

  const navLinks = useMemo(() => links, []);

  function handleSupportNav(event: React.MouseEvent<HTMLAnchorElement>, section?: "support" | "contact") {
    if (pathname !== "/support" || !section) {
      return;
    }

    event.preventDefault();

    const targetId = section === "contact" ? "message-form" : "support-overview";
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    const newHash = section === "contact" ? "#message-form" : "#support-overview";
    window.history.replaceState(null, "", `/support${newHash}`);
    setSupportSection(section);
  }

  function isActive(link: (typeof links)[number]) {
    const baseHref = link.href.split("#")[0];

    if (pathname !== "/support") {
      return pathname === baseHref;
    }

    if (link.section) {
      return supportSection === link.section;
    }

    return pathname === baseHref;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      <Container className="flex items-center justify-between py-5">
        <div className="flex items-center gap-16">
          <BrandLogo variant="icon" />

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(event) => handleSupportNav(event, link.section)}
                className={`text-sm font-medium transition ${
                  isActive(link) ? "text-white" : "text-zinc-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/license-activation"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/20 hover:text-white sm:inline-flex"
          >
            License
          </Link>
          <Link
            href="/products"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300"
          >
            Shop Now
          </Link>
        </div>
      </Container>
    </header>
  );
}
