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

The bot therefore requires an authorized officer to record **application acceptance and the verified link between a Discord member and an RSI handle**. This is recording the acceptance/identity evidence, not conducting a promotion ballot. Foundling itself requires zero votes.

`/personnel accept-application member:<Discord member> rsi-handle:<handle> evidence:<source> rsi-confirmed:true`

Set `rsi-confirmed:true` only after checking actual CUTTERWOLF membership and the linked identity. This immediately queues Foundling. If membership is not yet confirmed, omit that option; the application remains pending membership verification.

An optional **unofficial** public-membership provider is supported through `RSI_MEMBERSHIP_API_KEY`. Its documented user endpoint returns an RSI handle and primary organization. The bot checks only accepted, officer-linked identities, requires an exact handle match, CUTTERWOLF as the returned primary organization, and a fresh successful response. Missing, stale, private, or unavailable information never counts as membership proof. This connector does not establish application acceptance, and it does not automatically verify an affiliate whose primary organization is elsewhere; use documented manual confirmation for those cases. Pending identities are checked at most once every six hours, ten per worker pass, to limit quota consumption. API errors are logged and do not grant ranks.

Provider reference: [Common Patterns](https://v2.starcitizen-api.com/docs/guides/common-patterns). RSI background: [Organizations](https://support.robertsspaceindustries.com/hc/en-us/articles/115010675447-Organizations).

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
| LOCOPS | LOCOPS - Command | Heavy Lift; Salvage; Mining; Engineer | zombierecon `173989558877159424` |
| ARCOPS | ARCOPS - Command | Chimeras; Wayfinders; Replicators | Not yet supplied |

The full Discord specialist names include their command prefix, e.g. `LOCOPS - Mining`. The Clan Warlord runs `/personnel initialize-commands` to resolve **unique exact role names** into actual IDs. Missing/duplicate names are reported and skipped. No IDs are invented. Named Captain bindings come from `COMMAND_DEFINITIONS` in `lib/personnel/policy.js`; a named owner still needs live Captain rank. For commands without named owners, live Captain **plus the corresponding Command role** is required. Once named owners are configured, an unrelated Captain cannot bypass that owner list just by possessing the Command role. Re-running initialization replaces stored mappings with the reviewed definitions.

`/personnel assign-role command:LOCOPS member:<member> role:<LOCOPS - Mining> action:Assign`

The role input uses autocomplete scoped to the selected command's exact specialist names and initialized role IDs. It hides unrelated server roles, Command authority roles, managed roles, roles above the bot, and roles with administrative/moderation powers. Choose the command first, then type in the role field. Missing command mappings return no suggestions; initialize the command mappings after applying the personnel migration. Restarting the enabled personnel bot updates the slash command schema.

The target must already hold Member and House Wolf. Captains may assign/remove only the stored specialist allowlist, never Visitor, Buyer, membership, rank, officer, or Command authority roles. Roles carrying administrative/moderation powers are refused even if accidentally allowlisted. Captains cannot transfer a member from a different command; that requires the Clan Warlord. Unassigned organization members can be assigned into the Captain's command. Target-member advisory locks serialize concurrent assignments so two Captains cannot race a cross-command restriction. Assignments, failures, actor IDs, and roles are audited. Corresponding website role records are updated; existing JWT sessions may still require signing in again to refresh cached permissions.

## Execution, recovery, and announcements

The worker checks eligibility every minute. Promotion requests are unique per member/source-rank/tenure, so a restart does not reset service time or create a new ballot. Database claims prevent multiple workers from applying the same order. Source and target roles are checked against the recorded tenure; external rank changes stop an old order as `STALE` instead of demoting someone. All required roles must exist below the bot's highest role before any role mutation starts.

Role additions/removals use individual role endpoints and preserve unrelated roles. Target ranks are added before old ranks are removed. Partial failures retry idempotently after one minute. After verified role reconciliation, the database records the effective rank/date, updates website role/rank data, and retires any temporary marketplace guest record. A failed website/database commit leaves execution retryable. No public promotion announcement is sent before confirmed completion.

Announcements go to `1182947312465625088`, with a House Wolf banner, member avatar, effective ’Verse date, and a separate commission tailored to the new rank's responsibilities. Copy does not invent personal achievements, gender, a named signatory, or a command appointment beyond the supplied rank. It signs as House Wolf Command / Officer Corps. Only the promoted member can be pinged. Announcement jobs retry independently without reapplying rank changes.

Stored message IDs and deterministic Discord nonces reduce duplicate messages. Discord nonce deduplication is time-limited: a crash after posting but before saving the message ID can still result in a later duplicate. This is not represented as an exactly-once distributed transaction.

## Activation checklist

1. Review/apply the new personnel migration and the pending onboarding/guest-lifecycle migrations through the normal deployment process. `pnpm exec prisma migrate deploy` applies **all** pending migrations, so review that list first.
2. Regenerate Prisma with `pnpm db:generate`. Windows currently has the generated engine DLL locked by another process; stop/restart the process using that client before regeneration. Do not deploy partially generated artifacts.
3. Confirm `DISCORD_GUILD_ID` and `BUYER_ROLE_ID`. Visitor defaults to the supplied `1193387275510370374`; an explicit `VISITOR_ROLE_ID` override must point to that intended role.
4. The bot needs Manage Roles, View Channels, Send Messages, Embed Links, and Attach Files in the two configured channels. Its highest role must be above every rank/membership role it will change. Slash commands must be available to the installed application.
5. Optionally configure the unofficial membership API key. Do not put RSI credentials or cookies in that setting.
6. Set `PERSONNEL_ENABLED=true` and restart the bot. Only then does it register/update the guild's `/personnel` command and start the worker. Other application commands are preserved.
7. Have the Clan Warlord initialize command mappings, then import verified existing service dates. Test using a controlled test member and confirm actual Discord permissions before relying on automation.

Automated checks: `node --test scripts/test-personnel.mjs scripts/test-marketplace-guests.mjs scripts/test-onboarding.mjs`. Tests mock Discord/database operations and do not register commands, post to live channels, or change real member roles.
