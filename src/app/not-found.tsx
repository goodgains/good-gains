import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <section className="py-24">
      <Container className="text-center">
        <p className="text-sm uppercase tracking-[0.25em] text-zinc-500">404</p>
        <h1 className="mt-4 text-4xl font-semibold text-white">Page not found</h1>
        <p className="mt-4 text-base text-zinc-400">The page you requested does not exist.</p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black">
          Return Home
        </Link>
      </Container>
    </section>
  );
}
