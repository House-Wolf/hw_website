# Configuration inventory and deployment boundary

Inspected 2026-10-23; names only, no production secrets read/copied. Existing .env.example is authoritative for database/Auth.js/Discord/R2/UEX configuration. DISCORD_GUILD_ID and DISCORD_BOT_TOKEN remain server-only. Existing personnel channel constants are NOT events-channel defaults.

New placeholders (leave unset until operator confirms): DISCORD_EVENTS_CHANNEL_ID, DISCORD_OPERATION_REMINDERS_CHANNEL_ID, DISCORD_AAR_CHANNEL_ID, DISCORD_OPERATIONS_VOICE_CHANNEL_ID. COMMAND_DASHBOARD_ENABLED defaults false. COMMAND_DISCORD_DELIVERY_ENABLED defaults false. All four channels require guild/type/effective bot permission validation before enabling delivery. No Discord IDs may be guessed from names.

Development: never run pnpm dev (starts the live bot). Use web-only pnpm dev:next only with a safe local/disposable DB and mock adapters. Do not run migration/seed/configure-commands scripts against .env.local: existing configured database may be production. Build and tests need safe explicit environment injection, not a change to production settings.

No new Phase 1 settings table: SiteSetting and AuditLog already exist. Later operation migrations must be additive and pass on disposable PostgreSQL before operator applies them. Back up production first. New writes/delivery remain disabled until settings preflight, migrations, worker compatibility and staging checks are complete.

Discord official resources retrieved 2026-10-23: https://docs.discord.com/developers/resources/guild-scheduled-event and https://docs.discord.com/developers/topics/permissions . Before worker code, additionally verify interaction initial-response deadline, component/embed limits, message nonce guarantees, rate limits and installed discord.js APIs. Native external meetings require location/end time; voice event hosting channel is distinct from the events TEXT destination. Restricted native visibility must never be misrepresented.
