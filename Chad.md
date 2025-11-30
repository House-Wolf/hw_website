# Chad Security Review

## Top Risks (fix in order)
- [Critical] Unauthenticated marketplace upload (`app/api/marketplace/upload/route.ts`) is excluded from middleware and explicitly skips auth; anyone can write arbitrary files into `public/uploads/marketplace` (15MB each) by POSTing, enabling stored XSS/defacement and disk abuse.
- [High] Social links GET (`app/api/social-links/route.ts`) accepts any `status` without auth/permission (except `status=all`), so anonymous callers can dump PENDING/REJECTED submissions with user IDs, channel URLs, and metadata.
- [High] Upload handler trusts client MIME/extension and saves directly under webroot with no AV/quota/rate limits; a crafted payload tagged as `image/png` can still deliver HTML/JS for stored XSS. Remove the open upload entirely or harden heavily.
- [Medium] Contact seller API (`app/api/contact-seller/route.ts`) has no auth or throttling; easily abused for spam/DoS once wired to Discord. Requires session + rate limiting + audit.
- [Medium] Marketplace create/update (`app/api/marketplace/create`, `.../update/[id]`) lack schema validation and bounds (price/quantity/ranges), log raw bodies, and the update path will delete all images even when none are provided; malformed input (NaN) produces SQL errors and user data loss.
- [Medium] Suspension checks in `lib/marketplace/suspension.ts` fail open on errors, allowing suspended users to transact if Prisma/DB throws. Should fail closed while surfacing alerts.
- [Low] Corrupted characters in UI strings (e.g., `app/auth/signin/page.tsx`, admin/dossier UI) and verbose logging of user input (upload/update) reduce quality and leak data to logs.

## Detailed Findings

### 1) Unauthenticated arbitrary file upload (Critical)
- Location: `app/api/marketplace/upload/route.ts`; middleware explicitly excludes `api/marketplace/upload`.
- Behavior: No session/permission check; writes client-supplied files to `public/uploads/marketplace` with predictable names. Validation relies on client MIME and extension; 15MB per file; no rate limit or storage quota.
- Impact: Anyone can upload HTML/JS or large binaries for stored XSS, phishing, or disk exhaustion. Files are publicly served from `/uploads/marketplace/...`.
- Fix: Remove or disable the endpoint until secured. If kept, re-include in middleware, require authenticated + privileged users, verify file signatures (not MIME), enforce strict allowlist/size/quota, store outside webroot or in signed object storage, add AV scanning, and delete `upload-test` once monitoring is in place.

### 2) Social links data leak (High)
- Location: `app/api/social-links/route.ts`.
- Behavior: `status` query is unguarded; only `status=all` enforces auth. Anonymous callers can request `?status=PENDING` or other values and receive every pending/rejected submission with user profile fields.
- Impact: Exposes unapproved member submissions and Discord metadata to the public.
- Fix: Allow anonymous reads only for `status=APPROVED`; require session + `DOSSIER_ADMIN` (or similar) for any other status. Whitelist valid statuses, add pagination/rate limiting, and consider hiding user details for public responses.

### 3) Upload content trust & webroot storage (High)
- Location: `app/api/marketplace/upload/route.ts`.
- Behavior: Accepts whatever MIME/extension the client declares and writes into the served `public` tree. No scanning, no double-extension checks, no per-user quotas.
- Impact: Malicious content can be served back to users; easier stored XSS/HTML upload and disk abuse.
- Fix: After gating auth (see #1), inspect file signatures, enforce real image parsing/resizing, strip metadata, block HTML/SVG, randomize extensions, and move storage out of the public tree with signed URLs.

### 4) Contact-seller endpoint unauthenticated (Medium)
- Location: `app/api/contact-seller/route.ts`.
- Behavior: Anyone can POST arbitrary payloads; currently logs data and returns mock responses. No auth, abuse protection, or audit.
- Impact: Open spam/DoS surface; once Discord integration is added this becomes a spam vector into the community.
- Fix: Require authenticated members, rate-limit by IP/user, validate payload shape, and short-circuit until Discord-side protections are ready.

### 5) Marketplace input validation gaps (Medium)
- Locations: `app/api/marketplace/create/route.ts`, `app/api/marketplace/update/[id]/route.ts`.
- Issues: No bounds on price/quantity/length; `parseInt/parseFloat` results are not checked for `NaN`; update logs entire request body and deletes all images even if none are provided; no rate limiting. Malformed input yields 500s and data loss.
- Fix: Add schema validation (e.g., zod) with sane limits (price ranges, quantity >=1, length caps), reject `NaN`, remove noisy logging, only replace images when a new one is supplied, and rate-limit creation/updates.

### 6) Suspension checks fail open (Medium)
- Location: `lib/marketplace/suspension.ts`.
- Behavior: On Prisma/DB errors, functions return `false`, treating users as not suspended.
- Impact: A failing DB temporarily lifts suspensions, letting blocked users transact.
- Fix: Fail closed (treat as suspended) or surface maintenance mode; emit alerts/telemetry when checks fail.

### 7) Data/UX quality issues (Low)
- Garbled characters in UI strings (`app/auth/signin/page.tsx`, `app/auth/error/page.tsx`, admin dossier UI) likely due to encoding mixups; clean for professionalism.
- Verbose console logs in sensitive paths (`upload`, marketplace update) leak user-supplied data into logs; trim once debugging is done.

## Fast Follow Actions
- Disable `api/marketplace/upload` (and `upload-test`) until authenticated and hardened; sweep CDN for malicious uploads.
- Lock down `api/social-links` responses to approved-only for the public; add permission checks for everything else.
- Add global rate limiting for marketplace/social/contact endpoints and enforce consistent auth (including suspended users).
- Introduce shared validation schemas for marketplace payloads and sanitize logging.
