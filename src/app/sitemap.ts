import type { MetadataRoute } from "next";

import { bundle, getProductPath, products } from "@/lib/products";
import { CANONICAL_SITE_URL } from "@/lib/seo";

type SitemapEntry = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

const staticPages: SitemapEntry[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/products", priority: 0.95, changeFrequency: "weekly" },
  { path: "/bundle", priority: 0.95, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/custom-development", priority: 0.8, changeFrequency: "monthly" },
  { path: "/license-activation", priority: 0.7, changeFrequency: "monthly" },
  { path: "/recover-license", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" },
  { path: "/support", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.65, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.45, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.45, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.45, changeFrequency: "yearly" },
  { path: "/risk-disclaimer", priority: 0.4, changeFrequency: "yearly" }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const productPages: SitemapEntry[] = products.map((product) => ({
    path: getProductPath(product),
    priority: 0.9,
    changeFrequency: "weekly"
  }));

  const bundleAliasPage: SitemapEntry = {
    path: `/products/${bundle.slug}`,
    priority: 0.9,
    changeFrequency: "weekly"
  };

  return [...staticPages, ...productPages, bundleAliasPage].map((entry) => ({
    url: `${CANONICAL_SITE_URL}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }));
}
