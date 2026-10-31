# Wiki Index

Catalog of the MathSolver knowledge base. Entry point for agents: read this, then open the page you need. Schema & rules: [[AGENTS]].

## Pages

| Page | What's in it |
|---|---|
| [[codebase-map]] | Directory layout and where every route, API, component, and context lives. Start here to locate code. |
| [[product-overview]] | What the product does — every user-facing feature and how the solve/OCR/practice flows work. |
| [[web-languages]] | Web language URLs, 16 translated SSR homepages, metadata/hreflang/sitemap, solver/practice language contracts, RTL, and remaining English surfaces. |
| [[tech-and-ops]] | Stack, dependencies, hosting/deploy, env vars & secrets, known gotchas and stubbed/unbuilt features. |
| [[azure-migration]] | Azure web/API migration status, unchanged Google dependencies, keyless authentication, TLS/DNS, verification, and rollback. |
| [[growth-strategy]] | Market position, gap analysis, SEO plan, retention roadmap. Distilled from the July 2026 research. |
| [[calculator-pages]] | Shipped calculator routes, keyword map, reusable architecture, SEO contract, and launch checks. |
| [[mathgpt-video-research]] | Verified public behavior, likely architecture, cost model, and a Firebase-aware plan for explanation videos. |
| [[mobile-app-concept]] | The iOS/Android direction: July 2026 market research, positioning, roadmap, and status of the standalone Flutter implementation in `mobile_app/`. |
| [[monetization]] | Pricing ladder (Free / Plus / Unlimited), unit economics, revenue range, and the Stripe billing implementation: files, env vars, webhook setup, entitlement model, launch checklist, and what is not built yet. |

## Special files

- [[log]] — chronological, append-only record of ingests/changes/lints.

## Conventions

- Pages are markdown, interlinked with relative links. Keep each page focused and token-efficient.
- When adding a page, add a row here. When a fact changes, update the page and log it.
- "Fast facts" duplicated in `AGENTS.md` are the short version; these pages are the detail.
