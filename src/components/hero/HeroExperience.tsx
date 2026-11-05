"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { IFOOD_URL, MENU_URL } from "@/lib/config";
import { HERO_POSTER, pickHeroFrameVariant } from "@/lib/hero-frames";
import type { FrameScene } from "@/components/hero/frame-scene";
import type { FrameStream } from "@/components/hero/frame-stream";
import type { ScrollDriver } from "@/components/hero/scroll-driver";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function HeroExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderPctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const progressEl = progressRef.current;
    const counterEl = counterRef.current;
    const loaderEl = loaderRef.current;
    const loaderPctEl = loaderPctRef.current;

    if (!section || !stage || !canvas || !progressEl || !counterEl || !loaderEl || !loaderPctEl) {
      return;
    }

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let scene: FrameScene | null = null;
    let source: FrameStream | null = null;
    let driver: ScrollDriver | null = null;

    const reducedMotion = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    if (reducedMotion) {
      stage.dataset.reduced = "true";
      stage.dataset.ready = "true";
      section.dataset.fallback = "false";
      loaderEl.style.display = "none";
      return;
    }

    const fail = () => {
      if (cancelled) return;
      section.dataset.fallback = "true";
      stage.dataset.ready = "true";
      loaderEl.style.display = "none";
    };

    const init = async () => {
      try {
        const [{ createFrameStream }, { createFrameScene }, { createScrollDriver }] = await Promise.all([
          import("@/components/hero/frame-stream"),
          import("@/components/hero/frame-scene"),
          import("@/components/hero/scroll-driver"),
        ]);

        if (cancelled) {
          return;
        }

        const variant = pickHeroFrameVariant(window.innerWidth);
        source = createFrameStream({
          variant,
          onProgress(loaded: number, total: number) {
            if (cancelled || stage.dataset.ready === "true") return;
            if (!loaderPctEl) return;
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            loaderPctEl.textContent = `${pct}%`;
          },
          onError(error: unknown) {
            fail();
          },
        });

        scene = createFrameScene({
          canvas,
          source,
          smoothingMs: 24,
          onReady() {
            if (cancelled) return;
            stage.dataset.ready = "true";
          },
          onError() {
            fail();
          },
          onProgress(loaded: number, total: number) {
            if (cancelled || stage.dataset.ready === "true") return;
            if (!loaderPctEl) return;
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            loaderPctEl.textContent = `${pct}%`;
          },
        });

        if (cancelled) {
          scene?.dispose();
          source?.dispose();
          return;
        }

        driver = await createScrollDriver({
          trigger: section,
          frameCount: source.count,
          onFrame(index: number) {
            if (cancelled || !source || !scene) return;
            scene.setTargetFrame(index);
            const count = source.count || 75;
            counterEl.textContent = `${pad2(index + 1)} / ${String(count).padStart(2, "0")}`;
          },
          onProgress(p: number) {
            if (cancelled) return;
            const clamped = Math.max(0, Math.min(1, p));
            stage.style.setProperty("--hero-progress", String(clamped));
            const pct = Math.round(clamped * 100);
            const current = progressEl.getAttribute("aria-valuenow");
            if (current !== String(pct)) {
              progressEl.setAttribute("aria-valuenow", String(pct));
            }
          },
        });

        if (cancelled) {
          driver?.dispose();
          scene?.dispose();
          source?.dispose();
          return;
        }

        driver.refresh();

        observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!scene) return;
            scene.setActive(entry.isIntersecting);
          },
          { rootMargin: "300px 0px" }
        );
        observer.observe(stage);
      } catch (error) {
        fail();
      }
    };

    init();

    return () => {
      cancelled = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      try {
        driver?.dispose();
      } catch {}
      try {
        scene?.dispose();
      } catch {}
      try {
        source?.dispose();
      } catch {}
      driver = null;
      scene = null;
      source = null;
    };
  }, []);

  return (
    <section id="inicio" ref={sectionRef} className="hero" aria-labelledby="hero-title" data-ready="false">
      <div className="hero__stage" ref={stageRef}>
        <div className="hero__backdrop" aria-hidden="true" />
        <img
          className="hero__poster"
          src={HERO_POSTER.desktopSrc}
          srcSet={`${HERO_POSTER.mobileSrc} 960w, ${HERO_POSTER.desktopSrc} 1920w`}
          sizes="100vw"
          width={1920}
          height={1080}
          decoding="async"
          fetchPriority="high"
          alt=""
          aria-hidden="true"
        />
        <canvas className="hero__canvas" ref={canvasRef} aria-hidden="true" />
        <div className="hero__atmosphere" aria-hidden="true" />
        <div className="hero__scrim hero__scrim--top" aria-hidden="true" />
        <div className="hero__scrim hero__scrim--left" aria-hidden="true" />
        <div className="hero__scrim hero__scrim--bottom" aria-hidden="true" />
        <div className="hero__vignette" aria-hidden="true" />

        <div className="hero__content">
          <p className="hero__eyebrow">
            <span>Pão com Carne</span>
            <span className="hero__dot" aria-hidden="true">
              ·
            </span>
            <span>Itaim Bibi</span>
          </p>
          <div className="hero__copy">
            <p className="hero__kicker">Receita de família. Feita para reunir.</p>
            <h1 id="hero-title" className="hero__title">
              Sabor de família. Sem frescura.
            </h1>
            <p className="hero__lede">
              Pão, carne e bons encontros. Sem frescura, com o cuidado de quem gosta de receber.
            </p>
            <p className="hero__proof">
              <span aria-hidden="true">✦</span>
              <a href="#avaliacoes">Leia as avaliações de quem já veio</a>
            </p>
            <div className="hero__actions">
              <Button href={MENU_URL}>Conheça o cardápio</Button>
              <Button href={IFOOD_URL} variant="dark">
                Peça no iFood
              </Button>
            </div>
          </div>

          <div className="hero__footer">
            <div className="hero__scroll-cue" aria-hidden="true">
              <span className="hero__scroll-line" />
              <span>Role para ver</span>
            </div>
            <div
              className="hero__progress"
              role="progressbar"
              aria-label="Progresso da animação"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              ref={progressRef}
            >
              <span className="hero__progress-track" aria-hidden="true">
                <span className="hero__progress-fill" />
              </span>
              <span className="hero__progress-count" ref={counterRef} aria-hidden="true">
                01 / 75
              </span>
            </div>
          </div>

          <div className="hero__loader" ref={loaderRef} aria-live="polite">
            <span className="hero__loader-dot" aria-hidden="true" />
            <span>Carregando</span>
            <span className="hero__loader-pct" ref={loaderPctRef}>
              0%
            </span>
          </div>
          <p className="sr-only">
            Animação de um hambúrguer controlada pela rolagem.
          </p>
        </div>
      </div>
    </section>
  );
}
