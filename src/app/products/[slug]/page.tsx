import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetail } from "@/components/ProductDetail";
import { bundle, getProductBySlug, isBundleSlug, products } from "@/lib/products";
import { pageMetadata, productPageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return [...products.map((product) => ({ slug: product.slug })), { slug: bundle.slug }];
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return productPageMetadata[slug] ?? pageMetadata.products;
}

export default async function ProductPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (isBundleSlug(slug)) {
    return <ProductDetail bundleView={bundle} />;
  }

  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return <ProductDetail product={product} />;
}
