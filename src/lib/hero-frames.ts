export const HERO_FRAME_COUNT = 75;
export const HERO_FRAME_ASPECT = 16 / 9;

export const HERO_FRAME_VARIANTS = {
  desktop: 1920,
  mobile: 960,
} as const;

export type HeroFrameVariant = keyof typeof HERO_FRAME_VARIANTS;

export interface HeroPoster {
  mobileSrc: string;
  desktopSrc: string;
  width: number;
  height: number;
}

export const HERO_POSTER: HeroPoster = {
  mobileSrc: "/frames/chimibacon/960/frame_001.webp",
  desktopSrc: "/frames/chimibacon/1920/frame_001.webp",
  width: 1920,
  height: 1080,
};

export const HERO_FIRST_FRAME = 0;
export const HERO_LAST_FRAME = HERO_FRAME_COUNT - 1;

export function heroFrameUrl(index: number, variant: HeroFrameVariant | number): string {
  const clamped = clampFrameIndex(index);
  const width = typeof variant === "number" ? variant : HERO_FRAME_VARIANTS[variant];
  const frameNum = String(clamped + 1).padStart(3, "0");
  return `/frames/chimibacon/${width}/frame_${frameNum}.webp`;
}

export function clampFrameIndex(index: number): number {
  if (!Number.isFinite(index)) return HERO_FIRST_FRAME;
  // Round first, then clamp: values such as 74.6 must not become frame 75.
  return Math.min(HERO_LAST_FRAME, Math.max(HERO_FIRST_FRAME, Math.round(index)));
}

export function frameFromProgress(progress: number): number {
  if (!Number.isFinite(progress)) return HERO_FIRST_FRAME;
  const p = Math.max(0, Math.min(1, progress));
  const idx = p * (HERO_FRAME_COUNT - 1);
  return clampFrameIndex(idx);
}

export function pickHeroFrameVariant(viewportWidth: number): HeroFrameVariant {
  if (!Number.isFinite(viewportWidth)) return "mobile";
  return viewportWidth >= 768 ? "desktop" : "mobile";
}
