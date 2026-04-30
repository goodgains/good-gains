import { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  supportLine?: string;
  description: string;
  aside?: ReactNode;
};

export function PageHero({ eyebrow, title, supportLine, description, aside }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_rgba(0,0,0,0.94)_46%)]">
      <Container className="grid gap-8 py-20 md:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-6">
          {eyebrow ? (
            <span className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">{title}</h1>
          {supportLine ? <p className="max-w-3xl text-base font-medium text-emerald-100/90 md:text-lg">{supportLine}</p> : null}
          <p className="max-w-3xl text-lg leading-8 text-zinc-300">{description}</p>
        </div>
        {aside ? <div>{aside}</div> : null}
      </Container>
    </section>
  );
}
