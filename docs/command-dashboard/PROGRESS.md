# Command dashboard progress

## 2026-10-23 — Phase 0 inventory/design

Branch feature/command-dashboard created from clean current main 69101c24531ac356527813f765f2f15910ebbf7a after fetching origin/main. Reviewed baseline adc6afd3a4aa2a60889db4505e910b3f6830e3d1. One intervening commit contains the user's cleanup and specialty UI; preserved. Root/nested AGENTS absent on main; baseline root guidance read. Complete user contract saved verbatim from this thread at docs/house-wolf-dashboard-cli-instructions.md.

Phase 0 inventory/design/configuration and all V/P/H/F requirement mappings written before implementation. No implementation or migration claimed. No production writes, Discord sends, role edits, command registration or deployment performed.

Walkthrough fetch failed; transcript/frames not verified. Official OrgDeck description and Discord event/permission references retrieved. See traceability.md for source provenance and future acceptance evidence.

## 2026-10-24 — Phase 1 foundation checkpoint

Implemented reusable live officer/account/permission guards, Origin checks, transactional versioned settings API/form/audit, shared fleet normalization and honest readiness labels, safe Discord markdown formatting, and a disabled-by-default configuration/CI harness. Foundation evidence: 29 mocked authorization/settings tests, six fleet fixtures, three rendering fixtures and three real PostgreSQL settings transaction/audit/concurrency tests pass. This is a verified slice, not completion of Phase 1: direct-JWT privileged write sites still require migration. Personnel policy and marketplace listing categorization remain unchanged. See foundation.md.

Native event clarification implementation is being committed separately; its events text-channel setting is optional, never a native-event prerequisite. No production migration, Discord sends/roles/commands, deployment or branch push has occurred.

## 2026-10-24 — Native event clarification slice

The latest instruction overrides the events text-channel prerequisite. Implemented persisted operation drafts, Location → Event Info → Review → Publish, server-loaded voice choices, external location/end, validated UTC/IANA/DST conversion, optional decoded/re-encoded covers, and weekly/fortnightly UTC native recurrence. Native publication uses the existing bot credentials/guild with **no events text-channel ID**. Optional text announcement is separately queued/statused and failure does not undo native success. The detail API returns nativeEventUrl after confirmation, and the UI displays the required no-announcement notice.

Implemented live officer create/manage/dispatch checks; revision/state guards; transactional audits/outbox; PostgreSQL row locks/SKIP LOCKED leases; bounded retries/rate-limit handling; linked edits/cancellation; sending markers and restart reconciliation; ambiguity blocking across newer revisions; remote edit conflict review/adopt/reapply; deletion tombstone/explicit recreation. Explicit website commitments/preferences remain separate from Interested, attendance and seats. No bot commands or live interactions are registered by this slice.

Additive migrations: theme-gap repair plus command operations/deliveries/signups, uniqueness, indexes, state checks and retention FKs. All 16 repository migrations applied successfully to disposable PostgreSQL 16 on loopback only. Integration initially exposed missing theme_preference, a void-return advisory-lock query and JSONB key-order snapshot comparison; each was fixed and rerun, not hidden.

### Exact local outcomes

- `node scripts/verify-command-local.mjs migrate`: 16 migrations applied/up to date on `housewolf_command_test`, never the configured production database.
- `node scripts/verify-command-local.mjs integration`: **14 passed, 0 failed**. Actual PostgreSQL settings/operation transactions (including ten repeated concurrent settings races), duplicate submissions, role rollback/dispatch denial, two-worker expired-lease recovery, crash-after-POST mapping, optional announcement success/update/partial failure, explicit signup uniqueness, privacy/guild scope, 429/5xx/ambiguity, disconnected mapped-ID update retry and adopt/reapply/delete/recreate.
- `pnpm test:command`: **68 passed, 0 failed** (foundation, fleet, renderer, native events, HTTP and actual Sharp image validation).
- `node scripts/verify-command-local.mjs check`: `pnpm lint` **0 errors, 31 warnings** in the current workspace; `pnpm typecheck` passed; `pnpm exec prisma validate` passed; `pnpm test:bot` **259 passed, 0 failed**; `pnpm test` **357 passed, 0 failed**. Counts include other existing uncommitted bot/presentation tests; the committed branch was independently exported and checked: **339 unit/regression tests, 248 bot tests, 0 failures; lint 0 errors/34 warnings; types and Prisma validation passed**. Different counts reflect preserved, excluded user changes.
- Full `pnpm build` via `node scripts/verify-command-local.mjs build` **passed** in an isolated source copy with no `.env` files and explicit fake/disposable configuration. Prisma generation, Next production compilation, TypeScript and 44 static pages completed. The main checkout's build was attempted and failed because Windows locks its loaded Prisma DLL; no existing process was killed. The isolated build removes that filesystem lock without skipping Prisma generation or type checks.
- GitHub Actions workflow is prepared but not run remotely. Browser/mobile/keyboard journeys and real Discord/staging smoke are **not verified**. No production variables have been validated by these mocks.

The latest width request removed dashboard.css's 1480px content cap and added responsive 26–64px desktop gutters while retaining existing tablet/mobile rules and card columns. This change remains alongside the user's uncommitted dashboard presentation work; it is not swept into the native-event commits. Other bot/history/announcement/presentation changes found in the working tree were preserved and excluded from implementation commits.

### Review and deployment boundary

Final committed-source build (`05b1106`): full Prisma generation and Next production build passed in the clean export; TypeScript completed and all 44 static pages generated. The export contains only committed files, no production `.env` files, and no unrelated presentation/history/PWA edits. Final integration evidence is 14/14 passing, including safe mapped-ID PATCH retry and ten repeated settings races. The disposable container `hw-command-dashboard-test` remains available on loopback port 15432 for the next development session; no production database was used.

Branch `feature/command-dashboard`; phase 0 commit `088defa`, foundation commit `61a0bfa`; native slice commit `fe1d020`, retry/concurrency follow-up `669301a`. A follow-up verified fix distinguishes safe mapped-ID PATCH retries from uncertain native creates and uses a per-setting advisory lock to make settings races consistently return 409. `native-events.md` describes field ownership/API constraints; `deployment.md` covers operator setup, minimum permissions, migration order, staging smoke, ambiguity handling, shutdown and rollback. No branch push/PR creation (which may trigger deployment), production migration, website publish, Discord event/message send, role edit or command registration was performed. Feature flags remain false in `.env.example`. The optional events text ID remains unset.

### Remaining comprehensive scope — do not call the dashboard complete

Phase 1: finish auditing/migrating privileged routes that still read JWT permissions directly and session/derived-permission refresh after role changes. Phase 2: templates, full calendar/filter/pagination, bounded timezone-aware occurrences/edit-one/edit-future and remaining operation fields. Phase 3: reminders, richer optional posts/custom persistent bot signup interactions, remaining failure/audience acceptance. Phase 4: verified ship ownership/readiness, slots/seats/consent/overlaps, capacity/waitlist, transfers/wings. Phases 5–10: finalized attendance/AAR/analytics; qualifications/awards/personnel review; writable PackTracker/inventory reservations/manifests; supplemental recruiting/public identity/invites; deterministic Smart Assign preview/apply; exact ledger/payouts and isolated alliances. Phase 11: full browser/accessibility/security regression, remote CI and explicitly authorized staging/production handoff. Native recurrence is a documented supported subset, not the broader per-occurrence attendance implementation.

## Next work

Read this progress file and traceability.md, inspect current git state, and continue the first incomplete Phase 1 authorization requirement; do not restart inventory or rebuild finished native-event logic. Next inventory command: `rg -n 'session\.user\.permissions|session\?\.user\?\.permissions|token\.permissions' app/api lib`. Preserve existing narrower personnel policy and unrelated working-tree changes. Follow with domain/API denial tests for every migrated privileged write.

After edits run pnpm test, pnpm test:bot, pnpm lint, explicit typecheck, Prisma validation and pnpm build with safe test configuration. Never use configured .env.local for mutation/integration tests. Use disposable PostgreSQL for transaction/concurrency evidence. Update this file with exact outcomes and the next command before stopping.
