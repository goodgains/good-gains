"use client";

import { useEffect, useRef, useState } from "react";

type Testimonial = {
  name: string;
  role: string;
  quote: string;
};

export function TestimonialSlider({ testimonials }: { testimonials: Testimonial[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const highlightPhrases = ["saved me", "changed", "finally", "no more"];

  function scrollByCard(direction: "next" | "prev") {
    const track = trackRef.current;
    if (!track) return;

    const firstCard = track.querySelector<HTMLElement>("[data-testimonial-card]");
    const step = firstCard?.offsetWidth ? firstCard.offsetWidth + 24 : track.clientWidth;

    track.scrollBy({
      left: direction === "next" ? step : -step,
      behavior: "smooth"
    });
  }

  useEffect(() => {
    if (paused) return;

    const id = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;

      const maxScrollLeft = track.scrollWidth - track.clientWidth;
      if (track.scrollLeft >= maxScrollLeft - 8) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      scrollByCard("next");
    }, 3800);

    return () => window.clearInterval(id);
  }, [paused]);

  function renderHighlightedText(text: string) {
    const parts = text.split(new RegExp(`(${highlightPhrases.join("|")})`, "gi"));

    return parts.map((part, index) => {
      const isHighlight = highlightPhrases.some((phrase) => phrase.toLowerCase() === part.toLowerCase());

      return isHighlight ? (
        <strong key={`${part}-${index}`} className="font-semibold text-white">
          {part}
        </strong>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      );
    });
  }

  function renderQuote(quote: string) {
    const paragraphs = quote.split("\n\n").filter(Boolean);
    const firstParagraph = paragraphs[0] ?? quote;
    const remainingParagraphs = paragraphs.slice(1);

    return (
      <div className="space-y-4">
        <p className="text-xl font-medium leading-8 text-white">{renderHighlightedText(firstParagraph)}</p>
        {remainingParagraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-7 text-zinc-400">
            {renderHighlightedText(paragraph)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-emerald-300">
          <span className="text-base tracking-[0.2em]">★★★★★</span>
          <span className="text-sm font-medium text-zinc-400">4.8★ trader rating</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            aria-label="Previous testimonials"
            onClick={() => scrollByCard("prev")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/40 text-sm font-medium text-white transition hover:border-emerald-300/30 hover:bg-white/10"
          >
            Prev
          </button>
          <button
            type="button"
            aria-label="Next testimonials"
            onClick={() => scrollByCard("next")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-sm font-medium text-emerald-200 shadow-[0_0_22px_rgba(74,222,128,0.12)] transition hover:border-emerald-300/40 hover:bg-emerald-400/15"
          >
            Next
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {testimonials.map((testimonial, index) => (
          <article
            key={`${testimonial.name}-${testimonial.role}-${index}`}
            data-testimonial-card
            className="min-w-[88%] snap-start rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(0,0,0,0.94))] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_0_26px_rgba(74,222,128,0.05)] md:min-w-[calc(50%-12px)] xl:min-w-[calc(33.333%-16px)]"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm tracking-[0.2em] text-emerald-300">★★★★★</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                Active Trader
              </span>
            </div>
            <div className="mt-5">{renderQuote(testimonial.quote)}</div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="font-semibold text-white">{testimonial.name}</p>
              <p className="text-sm text-zinc-500">{testimonial.role}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
