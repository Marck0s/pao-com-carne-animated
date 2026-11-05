"use client";

import { useEffect, useRef } from "react";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { WordReveal } from "@/components/ui/WordReveal";
import { loadGsapScroll } from "@/lib/gsap-scroll";
import type { ImgKey } from "@/lib/images";

interface Shot { photo: ImgKey; ratio: string; tag?: string }

const SHOTS: Shot[] = [
  { photo: "burgersDeCima", ratio: "aspect-[4/5]" },
  { photo: "burgerCogumelos", ratio: "aspect-[4/5]" },
  { photo: "burgerCesta", ratio: "aspect-[4/5]" },
  { photo: "burgerCebolaBacon", ratio: "aspect-[16/10] md:aspect-[4/3]" },
  { photo: "burgerDuasMaos", ratio: "aspect-[4/3] md:aspect-square" },
  { photo: "doisBurgers", ratio: "aspect-[4/3]" },
];

export function Gallery() {
  const galleryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let revert: (() => void) | null = null;

    void loadGsapScroll()
      .then(({ gsap }) => {
        if (cancelled) return;
        const context = gsap.context(() => {
          gallery.querySelectorAll<HTMLElement>(".gallery-tile__parallax").forEach((image) => {
            gsap.fromTo(
              image,
              { yPercent: -5 },
              {
                yPercent: 5,
                ease: "none",
                scrollTrigger: {
                  trigger: image.closest(".gallery-tile"),
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              },
            );
          });
        }, gallery);
        revert = () => context.revert();
      })
      .catch((error: unknown) => {
        if (!cancelled) console.error("Não foi possível iniciar o parallax da galeria.", error);
      });

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return (
    <section ref={galleryRef} aria-label="Fotos" className="gallery-section relative overflow-clip px-4 py-20 text-cream sm:px-10 md:py-28 lg:px-14">
      <div className="gallery-grid mx-auto grid max-w-[1320px] gap-5 md:grid-cols-3 md:gap-8">
        <div className="relative z-10 md:col-span-3">
          <p className="section-eyebrow">Feito para compartilhar</p>
          <WordReveal text="Direto da chapa" className="section-title section-title--light" />
        </div>
        {SHOTS.map((s, i) => (
          <Reveal key={s.photo} variant="up" delay={(i % 3) * 120} className="gallery-tile relative z-10">
            <figure className={`relative m-0 w-full overflow-hidden ${s.ratio}`}>
              <div className="gallery-tile__parallax">
                <Photo
                  name={s.photo}
                  sizes="(max-width: 767px) 100vw, (max-width: 1200px) 30vw, 31vw"
                  quality={90}
                />
              </div>
              {s.tag && <span className="gallery-tile__tag absolute bottom-3.5 left-3.5 px-3.5 py-1.5 font-display text-lg">{s.tag}</span>}
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
