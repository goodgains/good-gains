import { ReactNode } from "react";
import { PageHero } from "@/components/PageHero";
import { Container } from "@/components/ui/Container";

export function LegalPage({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <PageHero title={title} description={description} eyebrow="Legal" />
      <section className="py-16">
        <Container className="max-w-4xl space-y-6 text-base leading-8 text-zinc-300">{children}</Container>
      </section>
    </>
  );
}
