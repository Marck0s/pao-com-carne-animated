"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { IFOOD_URL, MENU_URL } from "@/lib/config";
import { HERO_POSTER, pickHeroFrameVariant } from "@/lib/hero-frames";
import type { FrameScene } from "@/components/hero/frame-scene";
import type { FrameStream } from "@/components/hero/frame-stream";
import type { ScrollDriver } from "@/components/hero/scroll-driver";

const connectorPathLengths = new WeakMap<SVGPathElement, number>();

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function updateScrollOverlays(
  progress: number,
  copy: HTMLDivElement,
  eyebrow: HTMLSpanElement,
  callouts: HTMLDivElement,
  actions: HTMLDivElement,
): void {
  const fade = progressBetween(progress, 0.08, 0.48);
  copy.style.opacity = String(1 - fade);
  copy.style.transform = `translate3d(${-28 * fade}px, 0, 0)`;
  copy.inert = fade >= 0.55;
  eyebrow.style.opacity = String(1 - fade);
  eyebrow.style.transform = `translate3d(${-18 * fade}px, 0, 0)`;

  const connectorsSvg = callouts.querySelector<SVGSVGElement>(".hero__connectors");
  const screenMatrix = connectorsSvg ? connectorsSvg.getScreenCTM() : null;
  let inverseMatrix: DOMMatrix | null = null;
  if (screenMatrix) {
    try {
      inverseMatrix = screenMatrix.inverse();
    } catch {
      inverseMatrix = null;
    }
  }

  callouts.querySelectorAll<HTMLElement>("[data-callout]").forEach((label) => {
    const id = label.dataset.callout;
    const reveal = progressBetween(
      progress,
      Number(label.dataset.start),
      Number(label.dataset.end),
    );
    label.style.opacity = String(reveal);
    label.style.visibility = reveal > 0 ? "visible" : "hidden";
    const offsetX = 14 * (1 - reveal) * (id?.startsWith("right-") ? 1 : -1);
    label.style.transform = `translate3d(${offsetX}px, 0, 0) scale(${0.97 + reveal * 0.03})`;

    const connector = callouts.querySelector<SVGGElement>(`[data-connector="${id}"]`);
    if (!connector) return;
    connector.style.opacity = String(reveal);
    connector.style.visibility = reveal > 0 ? "visible" : "hidden";
    let activePath: SVGPathElement | undefined;
    connector.querySelectorAll<SVGPathElement>(".hero__connector-line").forEach((path) => {
      let length = connectorPathLengths.get(path);
      if (length === undefined) {
        length = path.getTotalLength();
        connectorPathLengths.set(path, length);
      }
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
      if (getComputedStyle(path).display !== "none") activePath = path;
    });

    const arrowhead = connector.querySelector<SVGPathElement>(".hero__arrowhead");
    if (!activePath || !arrowhead || reveal === 0) {
      if (arrowhead) arrowhead.style.visibility = "hidden";
      return;
    }

    const length = connectorPathLengths.get(activePath);
    if (!length) {
      arrowhead.style.visibility = "hidden";
      return;
    }

    drawArrowhead(arrowhead, activePath, length, screenMatrix, inverseMatrix);
  });

  const actionProgress = progressBetween(progress, 0.76, 0.94);
  actions.style.opacity = String(actionProgress);
  actions.style.visibility = actionProgress > 0 ? "visible" : "hidden";
  actions.style.transform = `translate3d(-50%, ${18 * (1 - actionProgress)}px, 0) scale(${0.97 + actionProgress * 0.03})`;
  actions.inert = actionProgress < 0.55;
  actions.setAttribute("aria-hidden", String(actionProgress < 0.55));
}

function progressBetween(progress: number, start: number, end: number): number {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

/**
 * The connectors live in a 0..1000 viewBox stretched with
 * `preserveAspectRatio="none"`, so a triangle authored directly in user units
 * gets sheared by the non-uniform scale (it ends up lopsided and can drift off
 * the line's visual tangent). Build the arrowhead in screen space, where it
 * stays isosceles and follows the real tangent, then map it back into the
 * SVG's user space before writing the `d` attribute.
 */
function drawArrowhead(
  arrowhead: SVGPathElement,
  path: SVGPathElement,
  visibleLength: number,
  screenMatrix: DOMMatrix | null,
  inverseMatrix: DOMMatrix | null,
): void {
  const svg = path.ownerSVGElement;
  if (!svg || !screenMatrix || !inverseMatrix) {
    arrowhead.style.visibility = "hidden";
    return;
  }

  const matrix = screenMatrix;
  const inverse = inverseMatrix;

  const compact = typeof window !== "undefined" && window.innerWidth < 768;
  const arrowLength = compact ? 11 : 16;
  const halfWidth = compact ? 4.5 : 7;

  const point = svg.createSVGPoint();
  const toScreen = (x: number, y: number) => {
    point.x = x;
    point.y = y;
    return point.matrixTransform(matrix);
  };

  const tipUser = path.getPointAtLength(visibleLength);
  const previousUser = path.getPointAtLength(Math.max(0, visibleLength - 1));
  const startUser = path.getPointAtLength(0);

  const tip = toScreen(tipUser.x, tipUser.y);
  const previous = toScreen(previousUser.x, previousUser.y);
  const start = toScreen(startUser.x, startUser.y);

  // Not enough of the line has been drawn yet for the arrowhead to sit on it.
  if (Math.hypot(tip.x - start.x, tip.y - start.y) < arrowLength) {
    arrowhead.style.visibility = "hidden";
    return;
  }

  const angle = Math.atan2(tip.y - previous.y, tip.x - previous.x);
  const backX = tip.x - Math.cos(angle) * arrowLength;
  const backY = tip.y - Math.sin(angle) * arrowLength;
  const sideX = Math.sin(angle) * halfWidth;
  const sideY = -Math.cos(angle) * halfWidth;

  const toUser = (x: number, y: number) => {
    point.x = x;
    point.y = y;
    return point.matrixTransform(inverse);
  };

  const tipPoint = toUser(tip.x, tip.y);
  const leftPoint = toUser(backX + sideX, backY + sideY);
  const rightPoint = toUser(backX - sideX, backY - sideY);

  arrowhead.setAttribute(
    "d",
    `M ${leftPoint.x} ${leftPoint.y} L ${tipPoint.x} ${tipPoint.y} L ${rightPoint.x} ${rightPoint.y}`,
  );
  arrowhead.style.visibility = "visible";
}

export function HeroExperience() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const calloutsRef = useRef<HTMLDivElement>(null);
  const finalActionsRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderPctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const copyEl = copyRef.current;
    const eyebrowEl = eyebrowRef.current;
    const calloutsEl = calloutsRef.current;
    const finalActionsEl = finalActionsRef.current;
    const progressEl = progressRef.current;
    const counterEl = counterRef.current;
    const loaderEl = loaderRef.current;
    const loaderPctEl = loaderPctRef.current;

    if (!section || !stage || !canvas || !copyEl || !eyebrowEl || !calloutsEl || !finalActionsEl || !progressEl || !counterEl || !loaderEl || !loaderPctEl) {
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
          maxPixelRatio: window.innerWidth >= 768 ? 2 : 1.5,
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
            updateScrollOverlays(clamped, copyEl, eyebrowEl, calloutsEl, finalActionsEl);
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
        <div className="hero__scrim hero__scrim--top" aria-hidden="true" />
        <div className="hero__scrim hero__scrim--left" aria-hidden="true" />
        <div className="hero__scrim hero__scrim--bottom" aria-hidden="true" />
        <div className="hero__vignette" aria-hidden="true" />

        <div className="hero__content">
          <p className="hero__eyebrow">
            <span className="hero__eyebrow-scroll" ref={eyebrowRef}>
              <span>Pão com Carne</span>
              <span className="hero__dot" aria-hidden="true">·</span>
              <span>Itaim Bibi</span>
            </span>
          </p>
          <div className="hero__copy" ref={copyRef}>
            <div className="hero__copy-scroll">
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
              <div className="hero__actions hero__actions--intro">
                <Button href={MENU_URL}>Conheça o cardápio</Button>
                <Button href={IFOOD_URL} variant="dark">
                  Peça no iFood
                </Button>
              </div>
            </div>
          </div>

          <div ref={calloutsRef} className="hero__callouts" role="list" aria-label="Ingredientes do hambúrguer">
            <svg className="hero__connectors" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
              <g data-connector="bun" className="hero__connector">
                <path className="hero__connector-line hero__connector-desktop" d="M250 160 C355 100 400 100 400 140" />
                <path className="hero__connector-line hero__connector-mobile" d="M360 180 C430 180 480 200 420 280" />
                <path className="hero__arrowhead" />
              </g>
              <g data-connector="mayo" className="hero__connector">
                <path className="hero__connector-line hero__connector-desktop" d="M250 500 C330 320 400 450 500 320" />
                <path className="hero__connector-line hero__connector-mobile" d="M360 420 C400 420 410 440 440 340" />
                <path className="hero__arrowhead" />
              </g>
              <g data-connector="onion" className="hero__connector">
                <path className="hero__connector-line hero__connector-desktop" d="M250 680 C330 680 370 520 445 590" />
                <path className="hero__connector-line hero__connector-mobile" d="M360 640 C400 640 410 560 445 450" />
                <path className="hero__arrowhead" />
              </g>
              <g data-connector="right-bacon" className="hero__connector">
                <path className="hero__connector-line hero__connector-desktop" d="M750 290 C710 290 690 355 650 360" />
                <path className="hero__connector-line hero__connector-mobile" d="M640 300 C620 300 620 370 640 420" />
                <path className="hero__arrowhead" />
              </g>
              <g data-connector="right-cheddar" className="hero__connector">
                <path className="hero__connector-line hero__connector-desktop" d="M750 535 C710 535 690 570 640 650" />
                <path className="hero__connector-line hero__connector-mobile" d="M640 520 C620 400 500 530 500 530" />
                <path className="hero__arrowhead" />
              </g>
              <g data-connector="right-beef" className="hero__connector">
                <path className="hero__connector-line hero__connector-desktop" d="M750 720 C710 720 690 800 600 800" />
                <path className="hero__connector-line hero__connector-mobile" d="M640 730 C620 730 610 630 600 530" />
                <path className="hero__arrowhead" />
              </g>
            </svg>
            <div className="hero__callout" role="listitem" data-callout="bun" data-start="0.22" data-end="0.43">
              <b>Pão de gergelim</b><span>Sesame seed bun</span>
            </div>
            <div className="hero__callout" role="listitem" data-callout="mayo" data-start="0.32" data-end="0.53">
              <b>Maionese de chimichurri</b><span>Chimichurri mayonnaise</span>
            </div>
            <div className="hero__callout" role="listitem" data-callout="onion" data-start="0.42" data-end="0.63">
              <b>Cebola caramelizada</b><span>Caramelized onions</span>
            </div>
            <div className="hero__callout hero__callout--right" role="listitem" data-callout="right-bacon" data-start="0.36" data-end="0.57">
              <b>Bacon em cubos</b><span>Diced bacon</span>
            </div>
            <div className="hero__callout hero__callout--right" role="listitem" data-callout="right-cheddar" data-start="0.50" data-end="0.71">
              <b>Queijo cheddar</b><span>Cheddar cheese</span>
            </div>
            <div className="hero__callout hero__callout--right" role="listitem" data-callout="right-beef" data-start="0.62" data-end="0.83">
              <b>Carne 180g in natura</b><span>Fresh beef patty · 180g</span>
            </div>
          </div>

          <div ref={finalActionsRef} className="hero__final-actions" aria-hidden="true" inert>
            <Button href={MENU_URL}>Conheça o Cardápio</Button>
            <Button href={IFOOD_URL} variant="dark">Peça no iFood</Button>
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
