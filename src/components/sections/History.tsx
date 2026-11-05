"use client";

import { useEffect, useRef } from "react";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { WordReveal } from "@/components/ui/WordReveal";
import { HISTORY_STEPS } from "@/data/history";
import { loadGsapScroll } from "@/lib/gsap-scroll";

export function History() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const timeline = timelineRef.current;
    const progress = progressRef.current;
    if (!timeline || !progress || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let revert: (() => void) | null = null;

    void loadGsapScroll()
      .then(({ gsap }) => {
        if (cancelled) return;
        const context = gsap.context(() => {
          gsap.fromTo(
            progress,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: timeline,
                start: "top 68%",
                end: "bottom 58%",
                scrub: 0.5,
              },
            },
          );
        }, timeline);
        revert = () => context.revert();
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error("Não foi possível iniciar a animação da linha do tempo.", error);
      });

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return (
    <section id="historia" className="story-section story-section--origin relative grid scroll-mt-20 gap-10 overflow-clip px-4 py-20 sm:px-10 md:grid-cols-[.9fr_1.1fr] md:gap-16 md:py-28 lg:px-14">
      <Reveal variant="mask" className="relative z-10 self-start md:max-w-[520px]">
        <figure className="story-photo relative m-0 aspect-[3/4]">
          <Photo name="ambiente" sizes="(max-width: 768px) 100vw, 520px" />
          <figcaption className="story-photo__caption absolute bottom-6 px-3.5 py-1.5 font-display text-[15px]">
            O ambiente da casa
          </figcaption>
        </figure>
      </Reveal>
      <div className="relative z-10">
        <p className="section-eyebrow">Uma história de família</p>
        <WordReveal text="Da portinha à referência" className="section-title section-title--light mb-8" />
        <div ref={timelineRef} className="story-timeline-wrap relative">
          <span ref={progressRef} aria-hidden="true" className="story-timeline__progress" />
          <ol className="story-timeline m-0 list-none p-0">
            {HISTORY_STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 140} className="story-timeline__item relative pb-8 pl-6">
                <b className="mb-1.5 block font-display text-[clamp(20px,2.4vw,30px)] font-normal leading-tight">{s.title}</b>
                <span>{s.text}</span>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
