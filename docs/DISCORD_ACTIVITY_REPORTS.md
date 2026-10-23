# House Wolf quarterly activity review

The bot records only each Discord user's last observed activity timestamp and type within each three-month period. It does not store message bodies, message counts, private DMs, voice recordings or voice duration. Activity means a non-bot server message, a slash command/button interaction, joining/moving to a non-AFK voice channel, or observed presence in a non-AFK voice channel while the bot is connected. Presence in voice does not prove someone is speaking.

Every three calendar months, CutterWolf (`486733578483269652`) and Sentinel_Wolf (`371697279704236043`) receive private reports. Each DM uses the House Wolf Officer Corps embed styling and includes a CSV of current House Wolf members, with last observed activity, activity type, join date, and whether any activity was recorded during that period. Inactive members appear first. Visitor-only accounts, temporary Buyer-only accounts and bots are excluded; membership, service-rank and officer roles identify the current House Wolf roster. Members who joined after a reporting period ended are not included in that older period's report.

Tracking starts when the updated bot first runs successfully against the migrated database. The first report is due three calendar months later, rather than claiming a complete history from before deployment. Startup logs display the tracking start and next due date in UTC. Reports describe observed activity, not definitive absence: bot downtime, channels it cannot view, approved leave and new join dates must be considered by leadership. Activity tracking never changes roles or removes members.

## Deployment

1. Apply `20261023010000_add_discord_activity_reports` with `pnpm db:deploy`.
2. Deploy the updated bot image. Its generated Prisma client includes the three new activity tables. No new API key is needed.
3. Tracking is enabled by default. Set `DISCORD_ACTIVITY_ENABLED=false` to disable tracking and reporting. Existing data and the schedule are preserved.
4. The bot must be able to view the server channels whose activity should count. The client subscribes to the standard Guild Messages and Guild Voice States intents; Guild Members is already required by the personnel service. No additional Message Content access is needed for this feature.
5. Both recipients must permit DMs from the bot. A closed-DM failure retries after 24 hours; other delivery failures retry after one hour. Each recipient's successful delivery is persisted independently. Reports and the schedule survive deployments and restarts; missed periods are prepared after downtime, one per worker pass, without inventing activity during the outage.

The attached CSV neutralizes spreadsheet formulas and protects long Discord IDs from numeric rounding. Large exports are gzip-compressed automatically. A deterministic Discord nonce reduces duplicate sends during retries; ambiguous network/DB failures outside Discord's nonce retention window can still cause a duplicate DM.

`pnpm test:bot` includes scheduling, restart, concurrent-worker, delivery-retry, period-boundary, roster-filtering and privacy tests. No test sends real DMs.
