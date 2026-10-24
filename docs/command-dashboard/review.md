# Proposed PR: Add durable native Discord events to the dashboard

House Wolf could display Discord events but had no persisted dashboard creation/publication workflow. This change adds officer-gated drafts and a Location → Event Info → Review → Publish form, then queues native Guild Scheduled Events through the bot worker. Native publication requires no events text-channel ID; optional announcements have independent mappings and delivery status.

The branch includes live account/role guards, versioned settings, additive operation/outbox/signup migrations, linked updates/cancellation, retry/lease recovery, explicit remote-edit/deletion conflict handling, safe image/timezone/recurrence validation, and explicit commitments separate from Interested. Separate foundation changes correct shared fleet normalization/readiness labels and safe Discord markdown rendering.

Review commits: `088defa` inventory/contract, `61a0bfa` foundation, `fe1d020` native workflow, `669301a` mapped update retry/settings concurrency. All remain local; no PR has been opened or branch pushed because hosting may deploy a push.

Validation: clean committed-source export passed 339 unit/regression tests, 248 bot tests, lint (0 errors, 34 existing warnings), TypeScript and Prisma validation. Disposable PostgreSQL integration passed 14 tests, including ten repeated settings races, operation duplicate submits, revoked authority rollback/dispatch denial, worker crash/restart, native edits/cancellation/deletion, independent optional announcement failure, scoped reads and explicit signups. Full Prisma-generation/Next production build passed in an isolated copy without `.env` files; the normal checkout has a Windows-locked Prisma DLL. Exact commands are in PROGRESS.md.

Deployment requires operator-approved migration/configuration and a compatible worker rollout; both feature flags default false. Native recurrence currently supports weekly/fortnightly UTC only; arbitrary schedules, bounded per-occurrence workflows and browser/staging/live Discord acceptance are not claimed. The broader dashboard contract remains incomplete: see traceability.md and deployment.md. Do not describe this PR as the entire command dashboard.

The user's other bot/history/announcement/dashboard theme changes remain uncommitted and excluded. The requested wider dashboard content adjustment is retained in their uncommitted dashboard.css alongside that presentation work; no unrelated changes were reset or swept into this branch's commits.
