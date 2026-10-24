# Activity history command

Run `/history` inside the configured House Wolf Discord server. The bot sends
CutterWolf (`486733578483269652`) and Sentinel_Wolf (`371697279704236043`) the same
private report. The invoking officer receives a private dispatch confirmation
showing which DMs were delivered or queued for retry.

Only current members with Clan Warlord (`1119791005382750288`) or Hand of the Clan
(`1119837295097434263`) can execute it. The bot fetches current roles before
preparing the report and again before queueing delivery. Administrator alone does
not authorize execution.

## Enable the command

Deploy/restart the bot with activity reporting enabled (`DISCORD_ACTIVITY_ENABLED`
defaults to enabled). Startup registers the guild command without replacing other
commands. To register it separately or retry a failed registration, run:

```sh
pnpm bot:configure-history
```

Registration sends no reports. The command is disabled by default for ordinary
members. Finish its visibility settings in **Server Settings → Integrations →
HouseWolf-MP → /history**: deny `@everyone`, allow the two roles above, and remove
any other role/user overrides. Configure this command specifically, rather than
changing the permissions of the bot's other commands.

Discord lets administrators see application commands regardless of these
overrides; the bot still rejects execution without one of the two required roles.

Alternatively, the configuration script can apply the two role overrides using
`DISCORD_COMMAND_PERMISSIONS_TOKEN`, a short-lived authorized administrator OAuth
bearer token with `applications.commands.permissions.update`. A bot token cannot
set these overrides. This token is only used by the configuration script, never
by the running bot. Do not store it in source control.

## Report contents

- A rolling three-calendar-month activity window, shortened when tracking began
  more recently. Current members with House Wolf membership, service, or officer
  roles are included; bots and visitors are excluded.
- Last observed Discord message, command/button interaction, or non-AFK voice
  participation. Tracking cannot recover activity from before it was enabled.
- A new lookup of each identifiable member's public primary RSI organization,
  using the existing membership provider and `RSI_MEMBERSHIP_API_KEY`. The lookup
  uses provider snapshots accepted only when at most one hour old; this is not
  a forced refresh or a measure of in-game activity. Linked RSI handles take
  precedence; otherwise only unique exact Discord names are considered. Name
  matches are labeled separately from linked identities.
- Confirmed CUTTERWOLF, other/no primary organization, and needs-verification
  statuses, with identity source, reason, evidence and timestamps in the CSV.
  Missing configuration, unknown handles, ambiguous identities, stale responses
  and provider errors are never treated as proof someone left the organization.

The report does not change Discord roles or personnel records. The scheduled
quarterly report also includes these membership checks. Manual reports are stored
in the existing delivery queue and do not advance the quarterly schedule. Failed
DMs retry automatically while the activity worker runs (one day for closed DMs;
one hour for other delivery failures). Successful recipients are not resent the
same queued report.

## Verification

`pnpm test:bot` covers command registration, role checks, private acknowledgements,
membership classification, monthly boundaries, scheduled/manual reports and DM
retry behavior using fake clients and providers. Tests send no real Discord DMs.
