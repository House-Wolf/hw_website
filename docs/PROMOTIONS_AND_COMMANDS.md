# House Wolf personnel orders

This module handles service records, due promotion reviews, persistent Discord ballots, role reconciliation, rank-specific announcements, and scoped command assignments. It is disabled unless `PERSONNEL_ENABLED=true`. No migration, command registration, live vote, role change, or announcement is performed merely by adding these files.

## Confirmed promotion rules

| Advancement | Required service in the previous rank | Net officer approvals | Role changes |
| --- | --- | --- | --- |
| Applicant → Foundling | Accepted application **and** confirmed CUTTERWOLF membership, tied to a verified Discord/RSI identity | No vote | Remove Visitor `1193387275510370374` and temporary Buyer if present; add Foundling `1122535749271683082`, Member `1319052362261725214`, House Wolf `1357688449871646873` |
| Foundling → Wolf Dragoon | 6 calendar months as Foundling | 1 | Remove Foundling; add Wolf Dragoon `1120183152430825532` |
| Wolf Dragoon → Rally Master | 12 calendar months as Wolf Dragoon | 2 | Remove Wolf Dragoon; add Rally Master `1318669443227975710` |
| Rally Master → Platoon Sergeant | 18 calendar months as Rally Master | 3 | Remove Rally Master; add Platoon Sergeant `1318668777881211023` |
| Platoon Sergeant → Field Marshal | 24 calendar months as Platoon Sergeant | 3 | Remove Platoon Sergeant; add Field Marshal `1318669440119734362` |

Durations apply to the **current rank**, not time since joining Discord or total organization service. End-of-month dates are clamped to the last day of the destination month; leap years are handled explicitly. Dates and eligibility use UTC. Promotion announcements use the supplied fiction-date convention: real year + 930, so 17 October 2026 is displayed as 17 October, 2956. Stored timestamps remain real dates.

## Officer voting and finality

Only these live Discord roles authorize voting:

| Role | Discord ID |
| --- | --- |
| Lieutenant | `1318673103424852092` |
| Captain | `1308253899357950034` |
| Fleet Commander | `1318668938854273077` |
| Armor | `1125067962827690065` |
| High Councilor | `1184242838507094186` |
| Hand of the Clan | `1119837295097434263` |
| Clan Warlord | `1119791005382750288` |

Eligible members receive a styled review card in officer-chat `1318677652835532902`, with their name/avatar, current and proposed ranks, tenure, eligibility date, net-vote progress, and Approve/Reject buttons. Buttons use persistent request IDs rather than in-memory collectors and continue working after restarts.

Ordinary rejections subtract from approvals. Three approvals and one ordinary rejection meet a two-net-approval requirement. Each officer has one ballot, which may be changed while review is pending. An officer cannot vote on their own advancement. The server, channel, original message ID, and voter's current rank are checked on every click.

Only a Clan Warlord rejection is a veto. It terminates a **pending** review regardless of its vote count. Per the subsequent instruction, **once approved, it is approved**: reaching the required net total finalizes the decision immediately, closes voting, and queues role execution. There is no waiting window and no retroactive veto. Concurrent decisions are serialized with a PostgreSQL row lock; whichever decision finalizes first is binding. Failed role changes remain an approved decision and are retried, not reopened for voting.

### Rejection review reminders

An ordinary rejection schedules a persistent reminder in officer-chat: **six calendar months** for advancement to Wolf Dragoon or Rally Master, **twelve calendar months** for advancement to Platoon Sergeant or Field Marshal. The interval starts at the first outstanding rejection; repeated votes do not postpone it. The worker checks every minute and catches up after downtime. The additional `20261022030000_add_promotion_review_reminders` migration also schedules existing pending ordinary rejections from their recorded ballot dates.

Reminders call the Officer Corps back to the original ballot with a direct link. Existing approvals and rejections remain recorded, and officers can change their own votes while the decision is pending. Reminders repeat at the same rank-specific interval while the rejection remains unresolved; they never assign roles or bypass the approval threshold. If all ordinary rejections are withdrawn, the reminder is cancelled. Approval or **The Clan Warlord’s veto** cancels reminders; vetoed decisions are **never automatically reopened**. A changed live rank or recorded tenure invalidates a stale reminder. Reminder sends are serialized against voting and audited, with a deterministic Discord nonce for retry deduplication.

## RSI membership and Foundling

The supplied RSI admin-members page requires authorized RSI access. The research did not establish a supported CIG API for private application acceptance. No RSI password, session cookie, or guessed administrative endpoint is used.

Applications and approval stay on [RSI's CUTTERWOLF applications page](https://robertsspaceindustries.com/en/orgs/CUTTERWOLF/admin/applications). There is no separate House Wolf application form. With `PERSONNEL_ENABLED=true` and `RSI_MEMBERSHIP_API_KEY` configured, the bot discovers Discord members even when they have no website or personnel record. A unique exact Discord display name, global name or username must match exactly one RSI account whose fresh public primary organization is CUTTERWOLF. Duplicate Discord names, multiple matching RSI accounts, conflicting links, missing/private/stale membership data and provider errors never authorize enrollment. Case is ignored; names are never guessed or cleaned up.

Confirmed public CUTTERWOLF membership is used as the signal following RSI approval. The bot cannot read the private application decision or submission date: `applicationAcceptedAt` records when membership was first observed, and the audit explicitly labels this `OBSERVED_CUTTERWOLF_MEMBERSHIP`, not an officer's review. Automatic matching is a convenience based on unique names, not proof of account ownership. Different-name, ambiguous or affiliate-only identities require leadership to verify the accounts and arrange an audited administrative identity link; no application-acceptance slash command is exposed. An existing linked handle takes precedence over Discord names.

The initial Foundling assignment uses the existing audited order and themed announcement, granting **Foundling, Member and House Wolf** and removing Visitor/temporary Buyer. Existing confirmed members are checked for missing roles and repaired without resetting tenure, removing higher ranks, adding Foundling to higher-ranked members, or issuing duplicate promotion announcements. Existing ranks without known start dates are recorded without inventing service history. No organization departures or rank demotions are automated.

Foundling itself requires zero votes. The `/personnel accept-application` subcommand and its interaction/autocomplete handlers have been removed. A stale Discord client using the old command receives a removal notice and cannot change membership. Approvals remain exclusively on the RSI website.

An optional **unofficial** public-membership provider is supported through `RSI_MEMBERSHIP_API_KEY`. Its documented user endpoint returns an RSI handle and primary organization. It requires an exact handle match, CUTTERWOLF as the returned primary organization, and a fresh successful response. Affiliates whose primary organization is elsewhere require an audited administrative verification/link. The worker runs on startup and every minute, discovering up to ten due Discord members per pass (at most three exact names each), plus up to ten officer-linked pending identities. The per-person cooldown survives restarts. `RSI_MEMBERSHIP_CHECK_INTERVAL_MS` defaults to `900000` (15 minutes); an old one-minute deployment setting is clamped to 15 minutes. Set it to `21600000` for six-hour checks. Values below one minute are rejected, and intervals between one and fifteen minutes are raised to fifteen minutes. Routine calls never force live refresh, so they do not consume the provider's daily refresh quota. Logs show whether discovery is enabled, unconfirmed or ambiguous matches, provider failures, and counts of lookups, confirmations and reconciliations. These messages never contain the API key or private application answers.

Provider reference: [Common Patterns](https://v2.starcitizen-api.com/docs/guides/common-patterns). RSI background: [Organizations](https://support.robertsspaceindustries.com/hc/en-us/articles/115010675447-Organizations).

Routine lookups use the provider's normal cached endpoint without `?refresh=true`. The provider refreshes its cache automatically; explicit refresh requests spend the daily allowance and must not be used for every polling lookup. The exact-handle, organization and one-hour freshness checks still apply, so a stale cached response never grants membership. See [Rate Limits & Quota](https://v2.starcitizen-api.com/docs/concepts/rate-limits).

## Existing service history

Discord roles do not supply the original time a member attained a rank. Existing members are **not** backdated from their server join date or assumed eligible immediately. The Clan Warlord can import documented history:

`/personnel service-history member:<member> rank:<their current service rank> since:2026-04-22 evidence:<historical promotion order or other record>`

The date must be an actual past/current YYYY-MM-DD date and match the member's live rank. Active orders block history changes. Imported dates and evidence are audited. Recording history does not change Discord roles. Future successful promotions automatically establish the next rank's start time.

## Captain command assignments

The supplied screenshot defines these families:

| Command | Authority role | Specialist roles | Named Captain |
| --- | --- | --- | --- |
| TACOPS | TACOPS - Command | Dire Wolfs; Howlers | MeddlerWolf `261698704468213763` |
| SPECOPS | SPECOPS - Command | Wolfen; Medic; Inquisitor | Not yet supplied |
| LOCOPS | LOCOPS - Command | Heavy Lift; Salvage; Mining; Engineer; Merchant | zombierecon `173989558877159424` |
| ARCOPS | ARCOPS - Command | Chimeras; Wayfinders; Replicators | Not yet supplied |

The full Discord specialist names include their command prefix, e.g. `LOCOPS - Mining`. The enabled personnel bot automatically initializes missing command mappings at startup by resolving **unique exact role names** into actual IDs. The former `/personnel initialize-commands` subcommand has been removed. Missing/duplicate names are reported and skipped. No IDs are invented. Named Captain bindings come from `COMMAND_DEFINITIONS` in `lib/personnel/policy.js`; a named owner still needs live Captain rank. For commands without named owners, live Captain **plus the corresponding Command role** is required. Once named owners are configured, an unrelated Captain cannot bypass that owner list just by possessing the Command role. Existing mappings and Captain bindings are preserved across restarts. `pnpm bot:configure-commands` initializes missing mappings, verifies every division's choices against live Discord roles, and updates the personnel slash-command definition without assigning any member roles.

Use the command for your division; no division dropdown is needed:

```text
/locops member:<member> role:<LOCOPS - Mining> action:Assign
/specops member:<member> role:<SPECOPS - Medic> action:Assign
/tacops member:<member> role:<TACOPS - Howlers> action:Assign
/arcops member:<member> role:<ARCOPS - Wayfinders> action:Assign
```

Choose `Remove` for the action to remove a specialist role. Discord slash-command names are lowercase. `/personnel` retains application acceptance and service-history commands; `/personnel assign-role` is removed from the registered schema. Cached legacy interactions are still validated during the transition.

Configured division commands register their approved specialist roles as fixed Discord choices, using the exact role names and IDs resolved from the stored mappings. Discord serves these small menus immediately, without a database or member lookup while the Captain is typing. Live Captain rank and command ownership are still checked before every assignment/removal; other-command Captains and unauthorized members cannot execute assignments. The Clan Warlord retains authority across all divisions. Discord may still list other division command names unless their visibility is restricted through the server's application-command permissions.

Role menus exclude unrelated server roles, Command authority roles, managed roles, roles above the bot, and roles with administrative/moderation powers. Mappings are initialized automatically after applying the personnel migration. The bot must have Manage Roles and its highest role must sit above all selectable specialist roles; otherwise those roles remain unavailable and the startup diagnostics identify the hierarchy problem. Cached legacy commands retain actor-scoped autocomplete. A division without safe configured choices remains unavailable while the other commands continue to work. Live role safety is rechecked when executing an assignment, so an outdated menu cannot grant an unsafe role.

Restarting the enabled personnel bot refreshes the fixed choices and all five slash commands. `node scripts/configure-personnel-commands.mjs --verify-only` checks live mappings and published dropdown choices without changing command registrations. Running that script without `--verify-only` refreshes registrations. Deploy a bot version that handles the division commands before first registering them; registering them against an old running bot will not activate their handlers. Fixed choices are compatible with the existing division assignment handlers.

When a new specialist is added to `COMMAND_DEFINITIONS`, explicitly extend an existing mapping with `node scripts/configure-personnel-commands.mjs "--add-specialist=locops:LOCOPS - Merchant"`. This validates the unique exact role name, permissions and bot hierarchy, appends its ID only once, preserves Captain bindings and existing specialists, then refreshes and reads back Discord menus. It does not assign any member roles. A normal restart preserves existing mappings rather than silently approving new specialists.

No additional database migration is needed for the division commands or the assignment-lock fix. `node scripts/verify-personnel-assignment-lock.mjs` verifies the production lock helper against the configured PostgreSQL database using synthetic identifiers, including mutual exclusion and lock release after commit/rollback, without changing member records or Discord roles.

The target must already hold Member and House Wolf. Captains may assign/remove only the stored specialist allowlist, never Visitor, Buyer, membership, rank, officer, or Command authority roles. Roles carrying administrative/moderation powers are refused even if accidentally allowlisted. Captains cannot transfer a member from a different command; that requires the Clan Warlord. Unassigned organization members can be assigned into the Captain's command. Target-member advisory locks serialize concurrent assignments so two Captains cannot race a cross-command restriction. Assignments, failures, actor IDs, and roles are audited. Corresponding website role records are updated; existing JWT sessions may still require signing in again to refresh cached permissions.

## Execution, recovery, and announcements

Personnel startup retries temporary database or Discord setup failures after 5, 10, 20, and 40 seconds, then once per minute until setup succeeds. Retries recheck Discord readiness, restore missing command mappings, and register the slash command before starting the worker. Setup attempts cannot overlap, and successful startup creates only one worker. Other bot services continue running while personnel setup recovers.

Specialist assignments are persisted in `personnel_role_assignments` before any Discord change. Apply `20261022040000_add_personnel_role_assignments` and regenerate Prisma before starting the updated personnel worker. A partial unique index permits only one pending assignment per member across all commands. Preserve this index in future migrations; Prisma does not represent partial indexes in the schema.

Discord calls run outside database transactions. After a fresh membership lookup confirms the role, website synchronization, completion status, and the completion audit commit together. A database failure, ambiguous Discord response, or worker crash leaves a durable job for the minute worker to recover. Jobs use five-minute execution leases and retry after one minute. A retry that finds the desired role already present or absent synchronizes the website without repeating the Discord mutation. Authority and command membership are rechecked before any repeated mutation; revoked authority or a departed member cancels the job after reconciling the observed Discord state. A pending job blocks conflicting assignments for that member. Slash-command replies distinguish confirmed completion, pending recovery, and cancellation.

The worker checks eligibility every minute. Promotion requests are unique per member/source-rank/tenure, so a restart does not reset service time or create a new ballot. Database claims prevent multiple workers from applying the same order. Source and target roles are checked against the recorded tenure; external rank changes stop an old order as `STALE` instead of demoting someone. All required roles must exist below the bot's highest role before any role mutation starts.

Role additions/removals use individual role endpoints and preserve unrelated roles. Target ranks are added before old ranks are removed. Partial failures retry idempotently after one minute. After verified role reconciliation, the database records the effective rank/date, updates website role/rank data, and retires any temporary marketplace guest record. A failed website/database commit leaves execution retryable. No public promotion announcement is sent before confirmed completion.

Announcements go to `1182947312465625088`, with a House Wolf banner, member avatar, effective ’Verse date, and a separate commission tailored to the new rank's responsibilities. Copy does not invent personal achievements, gender, a named signatory, or a command appointment beyond the supplied rank. It signs as House Wolf Command / Officer Corps. Only the promoted member can be pinged. Announcement jobs retry independently without reapplying rank changes.

Stored message IDs and deterministic Discord nonces reduce duplicate messages. Discord nonce deduplication is time-limited: a crash after posting but before saving the message ID can still result in a later duplicate. This is not represented as an exactly-once distributed transaction.

## Activation checklist

Run `pnpm db:status` to inspect pending migrations and `pnpm db:deploy` to apply reviewed migrations. These commands load local environment files with the same precedence as the bot while preserving variables supplied by the deployment platform. `pnpm db:verify:personnel` verifies the assignment queue's database constraints in a transaction that rolls back all verification rows. Run `pnpm test:bot` for the complete bot regression suite.

1. Review/apply the new personnel migration and the pending onboarding/guest-lifecycle migrations through the normal deployment process. `pnpm exec prisma migrate deploy` applies **all** pending migrations, so review that list first.
2. Regenerate Prisma with `pnpm db:generate`. Windows currently has the generated engine DLL locked by another process; stop/restart the process using that client before regeneration. Do not deploy partially generated artifacts.
3. Confirm `DISCORD_GUILD_ID` and `BUYER_ROLE_ID`. Visitor defaults to the supplied `1193387275510370374`; an explicit `VISITOR_ROLE_ID` override must point to that intended role.
4. The bot needs Manage Roles, View Channels, Send Messages, Embed Links, and Attach Files in the two configured channels. Its highest role must be above every rank/membership role it will change. Slash commands must be available to the installed application.
5. Optionally configure the unofficial membership API key. Do not put RSI credentials or cookies in that setting.
6. Set `PERSONNEL_ENABLED=true` and restart the bot. Only then does it register/update the guild's `/personnel`, `/locops`, `/specops`, `/tacops`, and `/arcops` commands and start the worker. Other application commands are preserved.
7. Confirm startup logs report all four division mappings as configured, or run `pnpm bot:configure-commands` to verify them. Then have the Clan Warlord import verified existing service dates. Test using a controlled test member and confirm actual Discord permissions before relying on automation.

Automated checks: `node --test scripts/test-personnel.mjs scripts/test-marketplace-guests.mjs scripts/test-onboarding.mjs`. Tests mock Discord/database operations and do not register commands, post to live channels, or change real member roles.

## Slash-command visibility

All five slash commands register with `default_member_permissions: "0"`, so regular members cannot see them by default. In **Server Settings > Integrations > HouseWolf-MP**, deny `@everyone` command access and explicitly allow **Leadership Core (`1182799457650233465`), Fleet Commander (`1318668938854273077`), Captain (`1308253899357950034`), and Lieutenant (`1318673103424852092`)**. Apply these settings to the whole integration and sync the five commands to those settings. Remove any conflicting user/role allows. Discord administrators can always see command entries because of Discord's built-in Administrator bypass, but the bot still rejects command execution unless the member currently holds one of these four roles. Autocomplete is also gated against a fresh Discord member fetch. Existing Captain/division and Warlord-only execution checks still apply; visibility does not grant authority to perform every operation.

The bot token can set safe command defaults but Discord does not allow it to edit role-specific command permission overrides. An administrator must configure those in Discord, or authorize a bearer token with `applications.commands.permissions.update`. The Lieutenant and Fleet Commander roles currently have no shared guild permission bit, so substituting a generic Manage Server/Moderate Members permission would exclude legitimate officers. See [Discord command permissions](https://docs.discord.com/developers/interactions/application-commands#permissions). `pnpm bot:configure-commands` publishes and verifies the restricted command definitions and removes the acceptance subcommand.
