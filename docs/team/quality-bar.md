# Quality Bar - "$5k website"

A site sold at this level must feel *designed*, not assembled from templates. The client should be able to tell within 5 seconds that someone obsessed over it.

## A. Hard gates (must pass)
| Area | Target |
|---|---|
| LCP | <= 2.5 s (mobile, throttled) |
| CLS | <= 0.1 (0 caused by animation) |
| INP | <= 200 ms |
| Lighthouse mobile (lab) | ESSENTIAL >= 90 perf; INTERACTION >= 80 perf; a11y >= 95; SEO >= 95; best-practices >= 95 |
| Initial JS (gzip) | ESSENTIAL <= 120 KB; INTERACTION <= 220 KB; heavy libs (GSAP plugins, Lenis, 3D) lazy where possible |
| Animation FPS | median >= 55 fps desktop; >= 45 fps mobile at 4x CPU throttle; <= 5% frames > 50 ms |
| Accessibility | WCAG 2.2 AA, full keyboard use, prefers-reduced-motion honored, contrast >= 4.5:1 text |
| Console | zero errors, zero hydration warnings |
| Content | no fabricated claims; all placeholders listed |

## B. Premium signals (scored by premium-auditor, 0-10 each)
1. Art direction: a clear, ownable visual idea (not "generic SaaS gradient").
2. Typography: deliberate pairing, fluid scale, tight hierarchy, good line length and leading.
3. Layout and rhythm: consistent grid, generous whitespace, intentional asymmetry/composition.
4. Imagery/graphics: real, cohesive, high quality; no stock-photo mush; consistent treatment.
5. Color and contrast: restrained palette, one accent used with discipline.
6. Copy: specific, benefit-led, scannable, in the client's voice; strong CTAs.
7. Motion: purposeful, consistent, polished (see rubric below).
8. Interaction detail: hover/focus/active/loading/empty/error states all designed.
9. Performance feel: instant first paint, no flash of invisible content, smooth scroll.
10. Trust and conversion: proof, clarity of offer, friction-free CTA path, mobile-first.
Pass: average >= 8, no dimension < 6.

## C. Motion rubric (scored by motion-critic, 100 pts)
| Category | Pts | What good looks like |
|---|---|---|
| Purpose | 15 | Each animation guides attention, explains a relationship or builds brand feel. Removable ones are removed. |
| Timing and easing | 15 | Durations from tokens (micro 150-300 ms, UI 300-500 ms, reveals 500-900 ms, hero <= 1.4 s). Eases are expressive (out-expo / out-quart style), never default linear/ease for UI. |
| Choreography | 15 | Clear lead element, staggered follow (30-80 ms steps, total <= 700 ms), consistent direction/distance language across sections. |
| Scroll experience | 15 | Pacing fits content, no scroll-jacking fatigue, pins are short and earn their length, parallax subtle (<= ~12% travel), anchors/back button work. |
| Technical quality | 20 | transform/opacity only, no FOUC/flash, no layout shift, clean cleanup, correct on resize/refresh, no long tasks, stable on 4x CPU throttle. |
| Responsive/touch | 10 | Dedicated mobile choreography; no hover-only content; touch feels native. |
| Accessibility | 10 | Reduced-motion variant is coherent; text readable during/after reveals; no flashing; focus never lost. |
Pass: >= 85 and no category below 70%.

## D. Anti-patterns that read as cheap (flag every one)
- Everything fades up with the same 0.6 s ease on every section.
- Headline invisible until JS loads (flash or blank hero); LCP element animating from opacity 0.
- Parallax or tilt so strong it causes motion sickness; custom cursor that lags or hides native cursor on touch.
- Scroll-jacking with no way out; pinned sections far longer than their content.
- Loaders that delay content to "show off".
- Animations that replay on every re-render; jitter on resize; layout jumping when fonts load.
- Mixed easing/duration languages between sections.
- 3D used as wallpaper with no purpose; heavy models; fans spinning on laptops.
- Stock gradients/blobs/glassmorphism with no brand reason; lorem ipsum; fake logos.
