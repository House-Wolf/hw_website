# Marketplace Buyer lifecycle

New marketplace users join through Discord OAuth with the Buyer role. The callback verifies live member roles, persists seven-day access directly in PostgreSQL, and removes Visitor and any explicitly configured onboarding interest roles. A database or Discord role failure returns `guest_access_failed` instead of pretending tracking succeeded. Tracking does not depend on the bot's HTTP service being online.

Existing regular members retain their membership roles and are not given Buyer or enrolled in temporary removal. Existing Buyer-only accounts can renew their temporary access. A stored guest who acquires any non-guest role is treated conservatively as a regular member: the worker removes the temporary Buyer role and retires the removal record, preserving all membership roles. No arbitrary role is stripped to force an account into the Buyer path.

## Required configuration

- Set `DISCORD_GUILD_ID`, `BUYER_ROLE_ID`, and `VISITOR_ROLE_ID` on both website and bot. Buyer and Visitor must be different roles. The worker refuses to run without them.
- Optionally set `MARKETPLACE_ONBOARDING_ROLE_IDS` to a comma-separated list of additional role IDs assigned by native onboarding that should be removed from temporary buyers. Never include actual member ranks or Buyer itself. Unknown roles are protected as membership roles rather than removed.
- Keep the bot's role above Buyer, Visitor, and the configured removable roles. The bot needs Manage Roles and Kick Members.
- Apply migration `20261022010000_fix_marketplace_guest_lifecycle`, regenerate Prisma, and restart the website and bot. Review other pending migrations before using `pnpm exec prisma migrate deploy`; do not assume this migration is the only pending change.

## Durable processing

The old seven-day in-memory timeouts and disconnected pending-buyer set have been removed. The worker polls every 15 seconds, processing at most 100 due records per pass. Each guest's next check is stored in the database: role reconciliation runs at least every five minutes, with checks also due at warning and expiry times. The same processor runs for member join/update events, including Visitor assigned after a marketplace join. If the bot was offline when a role changed, the next persisted check reconciles it.

The warning time remains day six and expiry remains day seven. Warning delivery state survives restarts; successful warnings are not routinely resent. Closed DMs are recorded without repeatedly attempting delivery. Transient warning failures are retried after five minutes; removal/network failures retain the record and retry after one minute. `last_error` records retryable failures. Only Discord's explicit Unknown Member response is treated as a confirmed departure; network failures do not delete records.

A per-record processing token and two-minute database lease prevent concurrent workers from operating on the same guest. Renewals refuse to overwrite a live lease and ask the caller to retry, avoiding an extension/removal race. Expiry processing force-fetches current Discord roles and checks the current lease and database expiry again immediately before requesting a kick. Members who no longer have Buyer or have acquired membership roles are protected. Guild IDs are checked throughout.

Native Community Onboarding screens are controlled by Discord, not this worker. To replace them with the custom flow, disable native onboarding in server settings. These changes remove configured roles from temporary buyers; they do not claim to bypass Discord's native UI. Server channel permissions still determine actual access. Converting a Buyer to a regular member should remove Buyer and grant their intended membership roles.

## Verification

`node --test scripts/test-marketplace-guests.mjs scripts/test-onboarding.mjs`

Tests use mocked Discord/database services, exercise role preservation, Visitor cleanup, restarts, expired snapshots after renewals, concurrent workers, failed kicks, unavailable DMs, and persistence failures. They do not join users, send live messages, or kick actual members. Discord and PostgreSQL cannot participate in one atomic transaction; a crash between a successful DM and saving its delivery marker can still result in a later duplicate warning.
