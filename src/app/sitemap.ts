import type { MetadataRoute } from "next";

import { getBaseUrl } from "@/lib/base-url";
import { bundle, products } from "@/lib/products";

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
  { path: "/terms-of-service", priority: 0.45, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.45, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.45, changeFrequency: "yearly" },
  { path: "/risk-disclaimer", priority: 0.4, changeFrequency: "yearly" }
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  const productPages: SitemapEntry[] = products.map((product) => ({
    path: `/products/${product.slug}`,
    priority: 0.9,
    changeFrequency: "weekly"
  }));

  const bundleAliasPage: SitemapEntry = {
    path: `/products/${bundle.slug}`,
    priority: 0.9,
    changeFrequency: "weekly"
  };

  return [...staticPages, ...productPages, bundleAliasPage].map((entry) => ({
    url: `${baseUrl}${entry.path}`,
    lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority
  }));
}
