type Gsap = typeof import("gsap").gsap;
export type ScrollTriggerStatic = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export interface GsapScrollBundle {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerStatic;
}

let cachedBundle: GsapScrollBundle | null = null;
let bundlePromise: Promise<GsapScrollBundle> | null = null;

export function loadGsapScroll(): Promise<GsapScrollBundle> {
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
      ScrollTrigger.config({ ignoreMobileResize: true });

      cachedBundle = { gsap, ScrollTrigger };
      return cachedBundle;
    })().catch((error: unknown) => {
      bundlePromise = null;
      throw error;
    });
  }

  return bundlePromise;
}
