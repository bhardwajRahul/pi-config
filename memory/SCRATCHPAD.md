# Scratchpad

<!-- 2026-04-28 15:48:25 [019dd451] -->
- [ ] parallelize deploy.yml — split single `deploy` job into matrix/parallel jobs per target (api / lighthouse / web / orbit-gateway). Currently 8+ min serial; could be ~2 min with parallel deploys. Share `bun install` via reusable workflow or actions/cache. Verify_deploy step also splittable into per-target post-job steps.
<!-- 2026-04-28 15:49:44 [019dd451] -->
- [ ] deploy.yml web bottleneck: two sequential next builds when environment=both. Fix order: (1) split deploy job into matrix per-target × per-env so api/lighthouse/web-prod/web-stag/orbit-gateway run concurrently; (2) cache bun install + node_modules via actions/cache; (3) consider replacing NEXT_PUBLIC_* inlining with runtime lookup so a single web build serves both envs. Critical-path target wall: ~14m → ~5m.
