# Field, relationship, state and permission design

## Reconciliation

Main 69101c2 includes the user's cleanup and unit-card work (97 changed files vs reviewed adc6afd); preserve it. No uncommitted work at branch creation. AGENTS and reference docs were deleted by that commit, not absent due to failure to inspect. Use the original contract saved at ../house-wolf-dashboard-cli-instructions.md. Schema inspection confirms PackTracker requests/medals/claims/inventory but no operation/seat/attendance/AAR/ledger/alliance workflow. SiteSetting already stores Json by key; AuditLog already relates a nullable actor to User.

## Boundaries

Pure policies in lib/command/*.js are usable by Node tests, web server adapters and the bot. Web identity is Auth.js user ID only; account status and Discord ID come from PostgreSQL. Live member roles come from the configured guild via an injected REST adapter. Never accept browser actor/guild/role claims. Server-only adapter supplies secrets. Cache only within one request; security rechecks bypass that cache. Never register commands/send messages/start bot during implementation tests. No real production DB migrations or seed writes.

Domain services own all persistence and transactional state transitions. HTTP adapters provide schema validation, same-origin enforcement, write rate limits, redacted 400/401/403/404/409/422/429/503 errors and correlation IDs. Native event/message jobs are separate adapters with separate IDs and never imply atomic delivery.

## Phase 1 settings reuse

SiteSetting key command:<configured guild ID>:settings, payload {schemaVersion:1, revision, enabled:false, channels:{events,reminders,aar,voice}, skillWeight, preferenceWeight}. Only live allowed officers may inspect/update command routing; final settings management may narrow further. Settings labels never modify officer IDs. Unset events destination is a configuration state, not a guessed ID. Both development and deployment keep enabled false until validated. Setting writes use a serializable transaction, optimistic revision, second fresh authority check before commit, and AuditLog metadata of changed keys only. No new table is justified for this slice. No production write is needed to verify adapters/mocks. Phase 2 adds explicit operation models and delivery jobs rather than treating settings as events.

Channel preflight: read configured guild, channel, guild roles and bot's member roles through injected adapters. Calculate VIEW_CHANNEL/SEND_MESSAGES/EMBED_LINKS using everyone, combined role and member overwrites in Discord order; Administrator is a bot permission calculation, not an officer bypass. Reject wrong guild/non-text events channel. Restricted destinations require deny-to-everyone plus proof against all non-eligible roles/member overwrites; if not provable, fail closed. Voice hosting is validated separately. Do not claim complete restricted-audience validation until its tests exist.

## Operations / persistence roadmap

Organization scope is server-selected configured House Wolf guild; partner scope will be explicit membership, never caller-supplied arbitrary guild IDs. Operation has UUID, creator FK RESTRICT, managers, revision, enum state, visibility, UTC start/end/muster/cutoff, authoring IANA timezone, sanitized rich brief/objectives, location/voice, capacity, equipment, qualification and seat requirements, image/build/risk. Separate bounded series and occurrence identity; DST ambiguity requires explicit offset/disambiguation. Draft→Published→Active→Completed→Archived; cancellation from Draft/Published/Active; corrections append revisions. Archived content never silently changes.

OperationSignup unique(operationId,userId). Row lock operation before capacity changes; serializable retry and transactionally promoted FIFO waitlist. CrewAssignment unique(operationSeatId), protected member/ship overlap checks with locks across conflicting time ranges. ShipInstance preserves verified owner, stable source ID/timestamps, model production state, declared availability and separate readiness attestation. Concepts never fulfill ready slots. No owner from public fleet inference.

Publishing transaction updates operation + unique(operation,revision,destination,type) outbox jobs + audit. Job leases use compare-and-set claims, bounded backoff, explicit partial/blocked/dead-letter/ambiguous states. Worker rechecks initiating officer for material privileged work; system reminders have a distinct limited capability. Native event audience is guild-wide: officer-only native event is omitted with an explicit status, never called private. Messages use allowedMentions allowlists. Crash-after-send reconciliation uses recorded IDs/markers/nonce where documented; no exactly-once claim. Reminders invalidate obsolete revisions/times.

Attendance is finalized, sourced and corrected by appended revision; RSVP and quarterly Discord activity remain separate. AAR has draft/review/final and private notes separated from publishable summary. Analytics show numerators/denominators/sample size. Reliability neutral for unknown history; approved absence never penalized. Training/qualification evidence separate from preferences; medals reuse PackTracker entities. Promotion ballots/tenure unchanged.

PackTracker keeps existing profile/request/comment/claim/blueprint/recipe/ownership/medal models. Central integer status transitions; stock movements and reservations are additive, idempotent, transactionally nonnegative. Operation manifests reserve organization inventory only; never mutate seller listing stock. Cancellation releases; fulfillment explicitly consumes/returns. Ledger postings are balanced exact decimals; approved payout snapshot immutable; reversals correct mistakes. Alliances explicitly isolate private rosters/notes/AAR/treasury and never grant House Wolf creation rights.

## Authorization race and freshness

PostgreSQL and Discord do not share a transaction. Recheck live roles and current account immediately before commit and again at privileged worker dispatch. A revocation after that check is an unavoidable external-service race; document and audit it, never claim cross-service atomicity. Provider failure denies with retryable 503. A privilege at login is display data only. Existing direct JWT checks must be inventoried and moved to the shared fresh guard before Phase 1 is marked complete.

## Verification and rollout

Use only injected mocks and disposable PostgreSQL for writes. Record CI/browser/DB results only after execution. Features default disabled. Additive migrations first, compatible web second, workers last. No destructive rollback of audited data. Disable workers before incompatible rollback, allow leases to expire, prefer forward fixes. Staging smoke procedure (operator authorization required): live officer draft/publish, separate native and text mapping, member commit, crew assignment, time edit/reminder, cancellation/buttons; separate completed record for attendance/AAR. Never real promotions/payouts as smoke tests.
