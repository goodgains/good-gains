import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { bundle, getProductBySlug, isBundleSlug, products } from "@/lib/products";

export function generateStaticParams() {
  return [...products.map((product) => ({ slug: product.slug })), { slug: bundle.slug }];
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
