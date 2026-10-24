# Manual crews and fleet readiness

This single-organization slice extends existing operations/Auth.js/live-role policies. PackTracker/logistics, optimization, treasury and automatic rank/award engines remain outside this slice. The design and acceptance matrix below preceded implementation.

| Requirement | Planned implementation | Acceptance evidence |
|---|---|---|
| Owned operational ships | Member declaration; current officer verification with evidence, model production state and crew capacity; owner availability/readiness | Unverified/concept/unavailable ships cannot staff an operation; public FleetYards listings alone never establish ownership |
| Consent | Manager attaches a verified ship; only its current owner grants/withdraws operation consent | Officer/admin cannot impersonate owner; overlapping consent denied; withdrawal releases active crew with audit |
| Manual seats/assignment | Named role seats, optional verified qualification; current qualifying operation manager assigns committed eligible members | One active occupant per seat and one seat per member/operation; DB-backed race tests; no cross-guild or time overlap |
| Qualifications | Minimal manual officer issue/revoke with evidence and optional expiry; no Discord role changes | Self-report never satisfies a credential; expired/revoked credentials reject assignment; no promotion automation |
| Presentation | Fleet Readiness member/officer forms; operation ships, consent, seats and assignment forms | Persisted APIs/domain services; mobile controls; errors preserve input; no disconnected mock UI |
| Lifecycle | Staffing revision separate from Discord briefing revision; reschedule/withdraw/cancel checks | Stale staffing writes denied; cancellation/withdrawal releases assignments without deleting history; reschedules cannot double-book |

## Data and state

Add CommandShip (guild, User owner FK RESTRICT, external reference optional, name/model, declared availability/readiness, officer ownership/model verification/evidence, crew capacity, revision); CommandOperationShip (operation/ship unique, owner consent timestamp); CommandSeat (operation, optional ship, label/role/required credential, archived); CommandCrewAssignment (seat/operation/member/assigner, active until released, reason/timestamps); CommandQualification (member/guild/code, issuer/evidence/expiry/revocation). Operational history is retained. Partial unique PostgreSQL indexes enforce active seat occupancy and active member/operation uniqueness. Existing public FleetYards browsing remains the source for browsing/model references; an internal declaration is verified independently and does not claim automatic owner sync.

Ship verification states: unverified → officer verified; owner model/reference changes invalidate verification. Availability is owner-declared AVAILABLE/UNAVAILABLE; readiness is READY/MAINTENANCE/UNKNOWN, distinct from FLIGHT_READY/CONCEPT/UNKNOWN model state. An officer's verification is an accountable manual assertion with evidence, never inferred from public registry membership. Only a verified, flight-ready, available, ready ship with owner consent may receive crew. Operational seat count cannot exceed verified capacity. Ground-team seats do not require a ship.

Single-operation staffing initially requires an explicit end time and a nonrecurring operation. Native recurring events remain available, but per-occurrence staffing is blocked until real occurrence identities exist; no pretend protection across an unbounded series. Operations must be PUBLISHED or ACTIVE to assign committed members. Draft managers may prepare ship/seat requirements without assigning members.

## Transactions and policy

Acquire a transaction-scoped configured-guild scheduling advisory lock before operation/ship row locks for all staffing/consent/readiness changes and operation material edits/lifecycle changes. Under that lock, re-read revision, account/membership/ownership, current qualified commitment, credential expiry, ship readiness/capacity/consent and overlapping operation intervals. Database uniqueness remains a backstop. Recheck live authority immediately before commit, acknowledging the existing unavoidable Discord/PostgreSQL race. Different crew changes bump crewRevision, not the Discord delivery revision. No crew mutation sends Discord messages.

Ship owners control declarations, availability and consent; current officers verify ownership/model data. Existing creator/co-manager/current Clan Warlord rules govern operation staffing. Officer status does not bypass owner consent or security/qualification constraints. Members can see public operation crew but managers alone receive candidate/evidence controls; qualification evidence is restricted. Maintain active account/live configured-guild membership checks on every write.

Withdrawn commitment/consent releases affected active assignments with a reason and audit, retaining assignment history. Cancelling/completing an operation releases active assignments; archived history is read-only. A model/readiness/capacity change incompatible with active commitments is rejected until consent/crew is released. Reschedules validate member and consenting-ship overlaps before commit. Credential revocation releases dependent assignments as an audited safety consequence.

## Rollout and verification

Additive migration first, compatible web/worker second; flags remain operator-controlled and disabled by default. New tables are not accessed by a worker until operation writes use the compatible code. Existing native delivery remains independent. Test real PostgreSQL constraints/locks using the named disposable loopback database, mocked live Discord adapters, current officer/lower-role/suspension/outage cases, consent/qualification expiry, simultaneous assignments and reschedule/withdrawal releases. Run existing bot and command regressions, lint/typecheck/Prisma validation and isolated production build. No production migration, live Discord testing or deployment is authorized.

## Implemented paths and API contract

Migration `20261024160000_manual_crews_readiness` adds the five domain models, operation staffing revision, retention foreign keys, composite seat/operation foreign keys, partial active-occupancy/qualification uniqueness and readiness/capacity checks. `lib/command/staffingPolicy.js`, `fleetService.js` and `crewService.js` share live authorization, validated inputs, transactional scheduling and audit logic. `operations.js` applies the same safeguards to lifecycle, rescheduling and commitment changes when staffing is enabled.

`/dashboard/fleet-readiness` provides persisted declaration, owner editing, independent officer verification and manual qualification issue/revoke forms. Operation details render `CrewPanel.tsx` with ship attachment, owner consent, named ship/ground seats, manager assignment/release, seat archiving and restricted audit/history. Reasons are mandatory for assignment, release and seat removal. Correcting a seat archives it and creates a replacement; history is retained.

| Endpoint | Methods / input | Authority |
|---|---|---|
| `/api/command/fleet` | GET; POST name/model/externalRef/requestKey UUID | Current eligible member; declaration is always self-owned; repeated request key returns the same declaration |
| `/api/command/fleet/[id]` | PATCH action/update or verify, revision, input | Owner edits declaration/readiness; another current officer verifies evidence/model/capacity |
| `/api/command/qualifications` | GET q; POST action/issue or revoke, input | Current officer; target must currently qualify; no self-issue; required evidence or revocation reason |
| `/api/command/operations/[id]/crew` | GET; POST action, crewRevision, input | Current eligible member for visible records; owner-only consent; current qualifying operation manager for all other changes |

Shared command HTTP handling enforces session, origin and write rate limits. Responses use existing structured errors: 401 unauthenticated, 403 insufficient authority, 404 absent/out-of-scope record, 409 revision/occupancy/schedule conflict, 422 invalid input, 429 rate limit, 503 disabled feature/provider outage. No browser actor/role/guild claims are accepted. Recoverable errors retain form inputs; a stale revision requires refresh and review. Native events, operational roles and credentials confer no security roles.

## Local evidence and remaining limits

`scripts/test-command-staffing.mjs` covers membership versus security roles, independent readiness, time windows and credential validity. `scripts/integration-command-staffing.mjs` runs 12 real disposable-PostgreSQL cases, including concurrent declaration idempotency, last-seat occupancy and ship-consent races, raw constraint backstops, capacity, qualifications/renewal/revocation, overlap/rescheduling, withdrawal/cancellation/seat archival history, stale/foreign/suspended/revoked authority, final authorization rollback and evidence/audit privacy. Combined with existing command integration tests: 26 passed, zero failures. Exact full regression/build outcomes are recorded in PROGRESS.md.

This does not implement attendance/AAR, signup capacity/waitlist promotion, wings, reserve crews, per-occurrence staffing, automatic FleetYards ownership import, training courses or award workflows. Qualification codes are manual evidence-backed credentials for seat eligibility. The existing public FleetYards registry remains linked, without asserting ownership from a public list. API/UI lists currently cap ships and qualification history at 200, member search at 30, assignment history at 200 and audit at 100; full pagination remains a scale follow-up. No browser/mobile journey or staging/live Discord verification is claimed.
