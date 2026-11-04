import { HERO_FRAME_COUNT } from "@/lib/hero-frames";

/**
 * Scroll -> frame driver.
 *
 * GSAP + ScrollTrigger are loaded dynamically so the hero engine can be
 * imported without paying for them until the scroll driver is actually used.
 * The trigger is the tall wrapper; the sticky stage is pure CSS (no pin).
 */

export interface ScrollDriverOptions {
  /** Tall scroll wrapper (element or selector). */
  trigger: Element | string;
  frameCount: number;
  onFrame: (index: number) => void;
  onProgress: (progress: number) => void;
  onReady?: () => void;
}

export interface ScrollDriver {
  refresh(): void;
  dispose(): void;
  getProgress(): number;
}

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;
type ScrollTriggerInstance = InstanceType<ScrollTriggerStatic>;

interface GsapBundle {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerStatic;
}

const SCRUB_SECONDS = 0.24;
const PROGRESS_EPSILON = 0.002;

/** Module-level guard: gsap.registerPlugin must run only once per page. */
let cachedBundle: GsapBundle | null = null;
let bundlePromise: Promise<GsapBundle> | null = null;

function loadGsapBundle(): Promise<GsapBundle> {
  if (cachedBundle) return Promise.resolve(cachedBundle);

  if (!bundlePromise) {
    bundlePromise = (async () => {
      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);
      // Mobile browser chrome changes should not invalidate every trigger.
      ScrollTrigger.config({ ignoreMobileResize: true });

      cachedBundle = { gsap, ScrollTrigger };
      return cachedBundle;
    })().catch((error: unknown) => {
      // Allow a later attempt (e.g. after a transient chunk load failure).
      bundlePromise = null;
      throw error;
    });
  }

  return bundlePromise;
}

export function createScrollDriver(options: ScrollDriverOptions): Promise<ScrollDriver> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("createScrollDriver requires a browser environment"));
  }

  return loadGsapBundle().then(({ gsap, ScrollTrigger }) => {
    const requestedCount = Number.isFinite(options.frameCount)
      ? Math.floor(options.frameCount)
      : HERO_FRAME_COUNT;
    const frameCount = Math.max(1, requestedCount);
    const lastIndex = frameCount - 1;

    const proxy = { frame: 0 };
    let lastFrame = -1;
    let lastProgress = -1;
    let disposed = false;

    function emit(): void {
      if (disposed) return;

      const value = clamp(proxy.frame, 0, lastIndex);
      const frame = lastIndex > 0 ? Math.round(value) : 0;

      if (frame !== lastFrame) {
        lastFrame = frame;
        try {
          options.onFrame(frame);
        } catch {
          // A consumer callback error must not break the ScrollTrigger loop.
        }
      }

      const progress = lastIndex > 0 ? value / lastIndex : 0;
      if (lastProgress < 0 || Math.abs(progress - lastProgress) >= PROGRESS_EPSILON) {
        lastProgress = progress;
        try {
          options.onProgress(progress);
        } catch {
          // Same as above.
        }
      }
    }

    // A numeric proxy is tweened by ScrollTrigger; the DOM is never touched
    // per scroll tick by GSAP itself.
    const tween = gsap.to(proxy, {
      frame: lastIndex,
      ease: "none",
      duration: 1,
      onUpdate: emit,
      scrollTrigger: {
        trigger: options.trigger,
        start: "top top",
        end: "bottom bottom",
        scrub: SCRUB_SECONDS,
        pin: false,
        markers: false,
        invalidateOnRefresh: true,
      },
    });

    const trigger: ScrollTriggerInstance | null = tween.scrollTrigger ?? null;
    let readyFired = false;

    function fireReady(): void {
      if (disposed || readyFired) return;
      readyFired = true;
      try {
        options.onReady?.();
      } catch {
        // Ignore consumer callback errors.
      }
    }

    function refresh(): void {
      if (disposed) return;
      trigger?.refresh();
      // Ensure proxies that were created before layout settled get the current
      // scroll position, even if ScrollTrigger did not emit on creation.
      ScrollTrigger.update();
      emit();
    }

    refresh();
    fireReady();

    // Fonts can change the wrapper height after first paint. Refresh once they
    // are ready, without creating any global ScrollTrigger listener.
    if (typeof document !== "undefined" && document.fonts) {
      void document.fonts.ready
        .then(() => {
          if (!disposed) refresh();
        })
        .catch(() => undefined);
    }

    // ScrollTrigger already listens to resize. This only makes sure the
    // consumer can re-sync the numeric mapping after late layout changes.
    function dispose(): void {
      if (disposed) return;
      disposed = true;

      // Kill only this tween/trigger, never ScrollTrigger.killAll().
      tween.kill();
      trigger?.kill();
    }

    function getProgress(): number {
      if (lastIndex <= 0) return 0;
      return clamp(proxy.frame / lastIndex, 0, 1);
    }

    return { refresh, dispose, getProgress };
  });
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
