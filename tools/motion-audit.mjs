#!/usr/bin/env node
/**
 * motion-audit.mjs - objective animation/scroll metrics + screenshots.
 *
 * Setup (once, in the project):  npm i -D playwright && npx playwright install chromium
 * Usage: node tools/motion-audit.mjs http://localhost:3000 [--out .motion-audit] [--steps 300] [--only mobile|desktop]
 *
 * Measures per profile (mobile = Pixel 7 @ 4x CPU throttle, desktop = 1440x900):
 *  - first-paint screenshot (detect flash / invisible hero)
 *  - frame times while scrolling with real wheel events (fps, p95, % frames > 33/50 ms)
 *  - long tasks, layout shifts (CLS), layout-property animation (width/height/top/left/margins via inline style mutations)
 *  - horizontal overflow, running animations under prefers-reduced-motion
 *  - ~12 evenly spaced viewport screenshots for visual review
 * Output: <out>/report.json + PNGs. Chromium only.
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:\/\//.test(a));
if (!url) { console.error('Usage: node tools/motion-audit.mjs <url> [--out dir] [--steps n] [--only mobile|desktop]'); process.exit(1); }
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const out = opt('out', '.motion-audit');
const maxSteps = Number(opt('steps', 300));
const only = opt('only', null);
await fs.mkdir(out, { recursive: true });

const profiles = [
  { name: 'mobile', ctx: { ...devices['Pixel 7'] }, cpu: 4, wheel: 90 },
  { name: 'desktop', ctx: { viewport: { width: 1440, height: 900 } }, cpu: 1, wheel: 120 },
].filter((p) => !only || p.name === only);

const initScript = () => {
  const m = (window.__m = { cls: 0, longTasks: [], layoutProps: {}, frames: [] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) m.cls += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
  } catch {}
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) m.longTasks.push(Math.round(e.duration)); })
      .observe({ type: 'longtask', buffered: true });
  } catch {}
  const sig = (s) => { const r = new Map(); let x; const str = s || ''; const re = /(?:^|;)\s*(width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*)\s*:\s*([^;]+)/g; while ((x = re.exec(str))) r.set(x[1], x[2].trim()); return r; };
  const start = () => new MutationObserver((muts) => {
    for (const mu of muts) {
      const el = mu.target; const a = sig(mu.oldValue); const b = sig(el.getAttribute('style'));
      for (const [k, v] of b) if (a.get(k) !== v) {
        const id = (el.tagName || '').toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '');
        const key = `${id}:${k}`; m.layoutProps[key] = (m.layoutProps[key] || 0) + 1;
      }
    }
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'], attributeOldValue: true });
  start();
};

const browser = await chromium.launch();
const report = { url, date: new Date().toISOString(), profiles: {} };

for (const p of profiles) {
  const context = await browser.newContext({ ...p.ctx, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.addInitScript(initScript);
  const cdp = await context.newCDPSession(page);
  if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: path.join(out, `${p.name}-00-first-paint.png`) });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `${p.name}-01-loaded.png`) });

  await page.evaluate(() => {
    const f = window.__m.frames; let last = performance.now();
    const tick = (t) => { f.push(t - last); last = t; window.__m.raf = requestAnimationFrame(tick); };
    window.__m.raf = requestAnimationFrame(tick);
  });

  const totalH = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  const shotEvery = Math.max(1, Math.floor(Math.min(maxSteps, Math.ceil((totalH - vh) / p.wheel)) / 12));
  await page.mouse.move(p.ctx.viewport?.width ? p.ctx.viewport.width / 2 : 200, 300);
  let steps = 0, shot = 2;
  while (steps < maxSteps) {
    await page.mouse.wheel(0, p.wheel);
    await page.waitForTimeout(32);
    steps++;
    if (steps % shotEvery === 0 && shot < 14) { await page.screenshot({ path: path.join(out, `${p.name}-${String(shot++).padStart(2, '0')}-scroll.png`) }); }
    const done = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2);
    if (done) break;
  }
  await page.waitForTimeout(600);

  const m = await page.evaluate(() => {
    cancelAnimationFrame(window.__m.raf);
    const f = window.__m.frames.slice(5).filter((x) => x > 0);
    const sorted = [...f].sort((a, b) => a - b);
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
    const avg = f.reduce((a, b) => a + b, 0) / (f.length || 1);
    const over = (ms) => +(100 * f.filter((x) => x > ms).length / (f.length || 1)).toFixed(1);
    return {
      frames: f.length, avgFps: +(1000 / avg).toFixed(1), medianFrameMs: +q(0.5).toFixed(1), p95FrameMs: +q(0.95).toFixed(1),
      pctOver33ms: over(33), pctOver50ms: over(50),
      cls: +window.__m.cls.toFixed(4), longTasksCount: window.__m.longTasks.length, longTasksMaxMs: Math.max(0, ...window.__m.longTasks),
      layoutPropAnimations: window.__m.layoutProps,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });

  // reduced-motion pass
  const rm = await browser.newContext({ ...p.ctx, reducedMotion: 'reduce' });
  const rp = await rm.newPage();
  await rp.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
  await rp.waitForTimeout(800);
  const reduced = await rp.evaluate(() => ({ runningAnimations: document.getAnimations().filter((a) => a.playState === 'running').length }));
  await rp.screenshot({ path: path.join(out, `${p.name}-reduced-motion.png`) });
  await rm.close();

  const flags = [];
  if (m.avgFps < (p.name === 'mobile' ? 45 : 55)) flags.push(`low fps (${m.avgFps})`);
  if (m.pctOver50ms > 5) flags.push(`${m.pctOver50ms}% frames > 50ms`);
  if (m.cls > 0.1) flags.push(`CLS ${m.cls}`);
  if (m.longTasksMaxMs > 200) flags.push(`long task ${m.longTasksMaxMs}ms`);
  if (Object.keys(m.layoutPropAnimations).length) flags.push('layout properties animated: ' + Object.keys(m.layoutPropAnimations).slice(0, 5).join(', '));
  if (m.horizontalOverflow) flags.push('horizontal overflow');
  if (errors.length) flags.push(`${errors.length} console errors`);
  report.profiles[p.name] = { metrics: m, reducedMotion: reduced, consoleErrors: errors.slice(0, 10), flags };
  await context.close();
}
await browser.close();
await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
for (const [n, r] of Object.entries(report.profiles)) {
  console.log(`\n[${n}] fps ${r.metrics.avgFps} | p95 ${r.metrics.p95FrameMs}ms | >50ms ${r.metrics.pctOver50ms}% | CLS ${r.metrics.cls} | long tasks ${r.metrics.longTasksCount} (max ${r.metrics.longTasksMaxMs}ms) | reduced-motion running anims ${r.reducedMotion.runningAnimations}`);
  console.log(r.flags.length ? '  FLAGS: ' + r.flags.join(' ; ') : '  no automatic flags');
}
console.log(`\nScreenshots + report.json in ${out}/ (review first-paint and scroll PNGs visually).`);
