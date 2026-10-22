# PackTracker Integration Plan

Source reviewed from `D:\PackTracker` and the public GitHub repo at `BrokkrForgemaster/PackTracker` (`main` commit `60fc8ec`, 2026-05-10).

## Current Shape

- PackTracker is a .NET 9 clean architecture solution.
- The API uses ASP.NET Core controllers, SignalR, EF Core, PostgreSQL, Discord OAuth, JWTs, and data protection keys.
- Main domains include profiles, assistance requests, crafting requests, procurement requests, guide requests, request comments/claims, lobby chat, UEX commodities/prices, blueprints, materials, blueprint recipes, blueprint ownership, organization inventory, medals, admin roles, and audit logs.
- Current GitHub `README.md` lists the active API surface as dashboard, UEX, blueprints, blueprint ownership, crafting requests, assistance requests, profiles, Discord, auth, general request, guide request, and wiki sync controllers.

## Unified App Direction

- Keep the public website, marketplace, dashboard, and PackTracker surfaces in one Next.js application.
- Reuse the existing website `User` identity and Discord role/permission model instead of maintaining PackTracker JWT/cookie auth separately.
- Extend the existing Prisma PostgreSQL schema with `packtracker_*` tables mapped from EF Core.
- Use Redis through `REDIS_URL` for rate limiting, short-lived state, and eventually hot dashboard/query cache.
- Port PackTracker API workflows into Next route handlers or server actions one feature slice at a time.
- Do not port PackTracker `RefreshToken`, `LoginState`, or ASP.NET data-protection tables unless desktop API compatibility becomes a hard requirement.

## First Migration Slices

1. Command dashboard shell under `/dashboard/packtracker`.
2. Read-only blueprint search and ownership views.
3. Request workflows for assistance, crafting, and procurement.
4. Guide request scheduling/assignment workflow.
5. Lobby/chat realtime replacement using the site runtime.
6. Admin role, Discord integration setting, medal, and audit surfaces after core user workflows are stable.

## Hosting Shape

- One web process for Next.js.
- One bot worker process for Discord automation.
- One PostgreSQL database.
- One Redis instance.
- Object storage for images/assets.
- HTTPS reverse proxy/CDN with canonical `https://www.housewolf.co` auth origin.
- Internal bot service calls should set `BOT_SERVICE_TOKEN` on both the website and bot process; this is a separate bearer secret, not the Discord bot token. Production bot endpoints fail closed when it is missing.

## Notes

- Do not iframe the WPF or ASP.NET UI into the website.
- Do not run a second PackTracker auth system for web users.
- Keep PackTracker desktop clients on API compatibility only if the desktop app must continue shipping.
