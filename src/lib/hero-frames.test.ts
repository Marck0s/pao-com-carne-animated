import { describe, expect, it } from "vitest";
import {
  HERO_POSTER,
  heroFrameUrl,
  pickHeroFrameVariant,
} from "./hero-frames";

describe("hero frame assets", () => {
  it("uses the full-resolution desktop sequence and the lighter mobile sequence", () => {
    expect(HERO_POSTER.desktopSrc).toBe("/frames/chimibacon/1920/frame_001.webp");
    expect(HERO_POSTER.mobileSrc).toBe("/frames/chimibacon/960/frame_001.webp");
    expect(HERO_POSTER.width).toBe(1920);
    expect(HERO_POSTER.height).toBe(1080);
    expect(heroFrameUrl(0, "desktop")).toBe("/frames/chimibacon/1920/frame_001.webp");
    expect(heroFrameUrl(74, "desktop")).toBe("/frames/chimibacon/1920/frame_075.webp");
    expect(heroFrameUrl(0, "mobile")).toBe("/frames/chimibacon/960/frame_001.webp");
  });

  it("selects the desktop sequence at the breakpoint", () => {
    expect(pickHeroFrameVariant(768)).toBe("desktop");
    expect(pickHeroFrameVariant(767)).toBe("mobile");
  });
});
