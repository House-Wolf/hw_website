# Discord bot on Vercel

## Deployment model

`vercel.json` declares one `discord-bot` Daemon instance in `iad1`, alongside the existing Next.js application. Vercel builds `Dockerfile.discord` and starts the bot when the deployment becomes production. It restarts a crashed instance and replaces the image on subsequent production deployments. The normal Next.js build/start commands are unchanged; neither the website build nor a request handler logs in to Discord.

This uses Vercel **Daemons (public beta)**, not an ordinary Vercel Function. Production-only daemon support and quotas must be checked in the project's Vercel dashboard. Preview deployments do not start this worker. Keep the Vercel project Root Directory at the repository root; the current beta does not support projects whose Root Directory is a subfolder. Do not increase the instance count or run an old copy of this bot elsewhere during the initial test.

The image installs locked production dependencies, generates Prisma for Linux, and includes the two House Wolf banner assets. It does not copy local environment files. Runtime secrets come from the Vercel project's Production environment variables. The generated client in the container does not depend on the Windows Prisma engine DLL.

## Required production configuration

- `DATABASE_URL`: the same database used by the website, with all applicable migrations applied before enabling workers.
- `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `BUYER_ROLE_ID`.
- `ONBOARDING_ENABLED=true` and `GENERAL_CHANNEL_ID` only after onboarding is ready. Otherwise keep onboarding disabled.
- `PERSONNEL_ENABLED=true` only after personnel migrations, permissions, and verified service history are ready. Otherwise keep personnel disabled.
- `VISITOR_ROLE_ID`, `MARKETPLACE_ONBOARDING_ROLE_IDS`, and other existing bot settings as appropriate. `NEXTAUTH_URL` is required when onboarding is enabled and must point to the live website.
- Optional `RSI_MEMBERSHIP_API_KEY` for public primary-organization checks.

The image sets `NODE_ENV=production` and `BOT_HTTP_ENABLED=false`. Do not override the latter to try to publish a daemon port. No bot token or secret may use a `NEXT_PUBLIC_` variable. Missing essential configuration stops startup and identifies variable names without printing their values.

Back up the database and review pending migrations before running `pnpm exec prisma migrate deploy` against production. Migrations are intentionally not run automatically by a Discord worker or a preview build.

## Important HTTP limitation

Vercel Daemons do **not** accept inbound HTTP/TCP traffic and cannot be rewrite targets. This worker supports Discord Gateway events, slash commands and buttons, onboarding welcomes, marketplace guest expiry, promotion checks, and reminders. Those features use outgoing Discord connections and the shared database.

Marketplace Contact Seller and its OAuth callback now create inquiries, threads, and buyer/seller DM notifications directly through Discord REST from the website. They require `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, and `MARKETPLACE_CHANNEL_ID` on the website, and no longer call `BOT_SERVICE_URL`. The bot needs View Channel, Send Messages, Embed Links, Create Public Threads, and Send Messages in Threads in the marketplace text channel. Closed DMs do not prevent the website from returning the conversation link. If thread creation fails after posting an inquiry, the modal and notifications link to that inquiry instead. These threads inherit marketplace channel visibility; they are not private buyer/seller channels.

The old Express service still contains legacy DM, member-role, and GitHub webhook endpoints. Those endpoints are **not exposed** by the daemon. `localhost:4000` on a website Function is not this worker. Preserve any external service still used by other integrations; avoid simultaneously enabling its background workers against this bot. `BOT_SERVICE_URL` is no longer globally required by website environment validation.

For a standalone HTTP deployment, the six service endpoints require `BOT_SERVICE_TOKEN` in production and authenticate every supported route spelling, including case variations and trailing slashes. Configure `GITHUB_WEBHOOK_SECRET` to the same secret set on the GitHub webhook. The webhook verifies GitHub's `X-Hub-Signature-256` against the raw JSON request bytes; missing configuration returns 503, and missing or invalid signatures return 401 without posting to Discord. GitHub uses its webhook secret rather than the bot service bearer token.

This configuration is not a claim that every legacy bot HTTP integration is production-ready on Vercel. Test the worker and HTTP integrations separately before a full cutover.

## Controlled verification

1. Confirm Daemons availability and quotas, configure Production variables, and apply reviewed migrations after a backup.
2. Ensure no conflicting bot worker is running elsewhere. Deploy to production with feature flags still disabled until ready.
3. In Vercel Logs, verify Discord login and the worker startup message. Confirm the bot appears online in Discord. Check failures in the daemon logs, not only website Function logs.
4. Enable the intended feature flags in a new production deployment, using test channels/accounts and verified records. Test onboarding, Buyer expiry protection, votes, Warlord veto, reminders, and role hierarchy.
5. Separately verify the legacy marketplace transaction-thread path before switching off its HTTP service.

To stop the worker, change its instance count to zero in `vercel.json` and redeploy, or use the Vercel dashboard scaling override. Feature flags do not stop marketplace guest expiry processing, which starts whenever the configured bot connects.

For a local container test: `docker build -f Dockerfile.discord -t housewolf-discord .`, then `docker run --rm --env-file .env.local housewolf-discord`. Use isolated test credentials; this connects to Discord and may process real database records. `pnpm start:bot` runs the standalone bot locally without a container.

## References

- [Vercel Daemons](https://vercel.com/docs/daemons)
- [Daemon configuration](https://vercel.com/docs/daemons/config-reference)
- [Daemon limitations and quotas](https://vercel.com/docs/daemons/limits)
