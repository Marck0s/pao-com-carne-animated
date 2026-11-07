# Team Protocol (shared by all agents)

Read this file once per task. Do not re-read it.

## 1. Plans (the orchestrator picks one and states it)

| Plan | What it is | Motion budget | 3D |
|---|---|---|---|
| PATCH | Small fix or tweak on an existing page | none/minimal | no |
| ESSENTIAL | Premium, fast, conversion-focused page. Static feel with refined CSS-level motion (hover, focus, simple scroll reveals via CSS / IntersectionObserver) | CSS-first. GSAP only for 1 small, justified moment | never |
| INTERACTION | Fully animated, art-directed site worth a premium ($5k+) price. Motion is part of the product | 1-2 signature moments, 3-5 supporting, rest ambient | only with user approval + decision memo |

## 2. Shared memory (docs/team/)
Agents communicate through short files, not long chat messages. Create only what the plan needs.

- `brief.md` - business, audience, offer, CTA, tone, language, references, constraints (orchestrator)
- `direction.md` - page structure, hierarchy, type, color, CTA strategy (uiux)
- `design-tokens.md` - colors, type, spacing, radius, shadow, z-index, breakpoints, MOTION tokens (design-system)
- `copy.md` - final copy per section id (copywriter)
- `architecture.md` - component tree, Server/Client split, deps, mounting strategy (architect)
- `motion-spec.md` - choreography per section (motion-director)
- `decisions.md` - append-only log, one line per decision: date | agent | decision | reason
- `reports/` - audit outputs (motion-critic, premium-auditor, qa)

Section IDs (e.g. `hero`, `features`, `proof`, `faq`, `cta`) are defined by uiux and reused everywhere (copy, tokens, motion-spec, data attributes, reports).

## 3. Token discipline (mandatory)
1. Read only what you need: `grep`/view line ranges, not whole directories. Never re-read a file you just wrote.
2. The orchestrator passes file PATHS, not pasted content.
3. Do not restate other agents' work. Reference it by path.
4. Reports are <= 20 lines. Details go in files under docs/team/.
5. Do not explore unrelated code. If blocked, report the blocker, do not widen scope.
6. Do not run builds/tests repeatedly. Run once after a batch of changes; re-run only on failure.
7. No filler: no preambles, no "I will now...", no repeating the task.
8. Audits (critic/auditor/qa) sample: key sections and 2 viewports first; go deeper only where issues cluster.

## 4. Report format (end of every agent run)
```
AGENT: <name>   PLAN: <plan>   STATUS: done | blocked | needs-decision
SUMMARY: 1-3 lines
FILES: path (created/modified), ...
DECISIONS: bullet, max 5
RISKS/OPEN: bullet, max 5 (with severity if known)
NEXT: <agent> because <reason>
```

## 5. Iteration limits
- Fix loop (audit -> fix -> re-audit): max 2 rounds. After that the orchestrator escalates to the user with the trade-off.
- Re-audits are TARGETED: only the failed items, not a full pass.
- Subagents never call other subagents. They recommend NEXT; the orchestrator routes.

## 6. File ownership (avoid parallel conflicts)
- `docs/team/*` - owner named above only; others append to decisions.md.
- `app/**`, `components/**` markup/styles - frontend.
- `lib/motion*`, `hooks/use*Motion*`, GSAP/Lenis code - animation.
- `components/three/**` - 3d-motion.
- metadata, sitemap, robots, JSON-LD - seo.
- tracking/consent code - growth-analytics.
- Others may fix a file they do not own only for trivial one-line issues, and must say so in the report.

## 7. Checkpoints with the user (cheap insurance)
1. After brief + direction (before building) - always for INTERACTION.
2. Before 3D/WebGL - always.
3. After first working build - show the motion audit summary.
4. Final - quality gate report.

## 8. Never
Invent testimonials, numbers, logos, awards, reviews or client names. Use `[PREENCHER: ...]` placeholders and list what is missing.
