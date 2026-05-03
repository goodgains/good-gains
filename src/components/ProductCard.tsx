import type { Route } from "next";
import Link from "next/link";
import { PaymentTrust } from "@/components/PaymentTrust";
import { Badge } from "@/components/ui/Badge";
import { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex h-full flex-col rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-white/15 hover:bg-zinc-950">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Badge>{product.category}</Badge>
          <div>
            <h3 className="text-2xl font-semibold text-white">{product.name}</h3>
            <p className="mt-2 text-sm leading-7 text-zinc-400">{product.shortDescription}</p>
            <p className="mt-3 text-base font-semibold leading-7 text-white">{product.benefitLine}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          {product.badge ? (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              {product.badge}
            </span>
          ) : null}
        </div>
      </div>

      <ul className="mb-6 space-y-3 text-sm text-zinc-300">
        {product.quickBullets.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span className="mt-2 h-2 w-2 rounded-full bg-emerald-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mb-4 mt-auto pt-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Price</p>
          <p className="text-3xl font-semibold text-white">From ${product.price}</p>
          <p className="mt-2 text-sm text-zinc-400">2-device license available for ${product.twoDevicePrice}</p>
          <p className="mt-2 text-sm font-medium text-emerald-200">Instant download after purchase</p>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href={`/products/${product.slug}` as Route}
          className="inline-flex w-full items-center justify-center rounded-full border border-emerald-200/50 bg-emerald-300 px-6 py-4 text-base font-semibold text-black shadow-[0_0_30px_rgba(74,222,128,0.32)] transition hover:-translate-y-0.5 hover:bg-emerald-200 hover:shadow-[0_0_40px_rgba(74,222,128,0.42)]"
        >
          View Product
        </Link>
        <PaymentTrust />
      </div>
    </article>
  );
}
