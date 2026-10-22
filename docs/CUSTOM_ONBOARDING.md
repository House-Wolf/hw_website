# Custom House Wolf onboarding

The public `/onboarding` page provides a two-step, responsive onboarding experience. Star Citizen interests are multi-select; Another game can be selected alongside them or on its own. The final screen preserves the four supplied server rules and requires explicit agreement.

Visitors can preview both steps without signing in. The Connect Discord & join button requests Discord login and permission to join House Wolf (`guilds.join`). The auth callback adds consenting newcomers to the configured server without assigning roles, then returns them to `/onboarding`. Existing members are not re-added or given different roles. Ordinary dashboard sign-in still requires existing membership. Answers are retained locally through sign-in, but rules must be accepted again after returning. Completion records interests, another game, the rules version, acceptance time, and completion time in `onboarding_profiles`. Interests are preferences, not permission-bearing role assignments.

Share `https://www.housewolf.co/onboarding` as the public joining link. The joining flow reuses the existing `/api/auth/callback/discord` OAuth redirect; no additional callback or secret is needed. The Discord bot must belong to the same application as the OAuth client, be installed in the server, and have the permissions required to add guild members. Keep `AUTH_URL` (if set) and `NEXTAUTH_URL` on the same canonical website origin. Discord invite URLs remain controlled by Discord and cannot redirect to this page.

## Activation

1. Apply the new migration using the repository's normal production migration process (`pnpm exec prisma migrate deploy`) and generate the Prisma client (`pnpm db:generate`). Review pending migrations before applying them.
2. Configure `VISITOR_ROLE_ID` with the actual Visitor role ID. Keep it distinct from `BUYER_ROLE_ID`, and place Visitor below the bot's highest role.
3. Configure `GENERAL_CHANNEL_ID` with the general chat channel ID. The bot needs View Channel, Send Messages, Embed Links, and Attach Files in that channel. Set `ONBOARDING_ENABLED=true` on the website and bot. Keep it false until the new experience and channel permissions are ready.
4. Test the complete flow with a regular Discord member account. Verify the answers and acceptance record and that only the intended Visitor role is added. Test a Buyer account separately: the completion endpoint must refuse to add Visitor.
5. In Discord server settings, disable built-in Community Onboarding when switching to this flow. Membership/Rules Screening is a separate setting; review it separately if replacing the final native rules screen too. The application never changes either server setting automatically.
6. Restrict unonboarded members' channel access and grant the Visitor role the intended access. Custom onboarding cannot enforce access without Discord channel permissions.

When enabled, the bot sends new non-Buyer members a welcome DM linking to `/onboarding`. If DMs are closed, it logs the failure; publish a persistent onboarding link in a channel visible to new members as a fallback. Existing members are not automatically messaged. Marketplace join events containing Buyer skip this welcome flow, and onboarding completion independently checks live Discord roles to keep buyers out of the Visitor path.

The website uses the bot's existing Discord token to assign Visitor through Discord's API; completing onboarding does not require the bot's Express service to be reachable. The bot worker handles the welcome message. The website must have `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `BUYER_ROLE_ID`, and `VISITOR_ROLE_ID` configured. A failed role assignment leaves a pending record and shows a retryable error; completion is recorded only after successful role assignment. Repeated completed submissions do not grant additional roles.

The bot now loads environment files in Next.js precedence order: `.env.<NODE_ENV>.local`, `.env.local`, `.env.<NODE_ENV>`, then `.env`, without overriding environment variables supplied by the host. It defaults to development when `NODE_ENV` is unset. Restart the website and bot after changing configuration or deploying the regenerated Prisma client.

## General-chat welcome

After completion, the bot picks up the persisted welcome job on its next 15-second poll. It posts a 1200 × 420 House Wolf banner with the member's Discord avatar and current server display name, followed by a separate teal-accented embed listing their Star Citizen interests and any other game. The banner uses the existing House Wolf background and emblem. If avatar download fails, the emblem is used instead. Mentions are restricted to the new member; supplied game names cannot ping roles or everyone.

Welcome jobs use a database claim to prevent multiple workers from processing the same member concurrently. Failures remain pending, with `welcome_last_error` stored for inspection, and retry after five minutes. Successful message IDs are stored to prevent routine duplicates across restarts. A deterministic Discord nonce provides additional protection for recent retries; Discord's nonce deduplication is time-limited, so a process crash after posting but before saving the ID can still produce a duplicate after that window. Buyer accounts and inactive accounts are excluded from announcements. Keep the bot worker running to deliver posts.

Run targeted checks with `node --test scripts/test-onboarding.mjs scripts/test-onboarding-join.mjs`. These use mocked authentication, database, and Discord calls and do not join real users, post live messages, or assign real roles. After deployment, test a nonmember authorizing the join, cancellation, an existing member, and a Buyer; confirm return to `/onboarding`, preserved interests, and Visitor granted only after rules are accepted and completion succeeds.

## Scope

The five supplied interests and four rules are defined in `lib/onboarding.ts`. Change the rules version when changing the agreement text. No interest roles, promotion workflows, automatic native-onboarding bypass, or server permission changes are included. This implementation does not remove existing membership roles. Marketplace guest handling now uses a durable worker that preserves promoted members and removes Visitor from tracked buyers; apply its migration and configure role IDs before activation. See `docs/MARKETPLACE_GUEST_LIFECYCLE.md`.
