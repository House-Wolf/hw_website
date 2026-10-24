# House Wolf

Next.js website, marketplace and member dashboard, with a separate Discord bot and a shared PostgreSQL database.

## Development

Use Node.js 22+ and pnpm 10. The dependency lockfile is `pnpm-lock.yaml`; use pnpm for installs and audits.

1. Copy `.env.example` to `.env.local` and configure the services you need.
2. Run `pnpm install` to install dependencies and generate Prisma Client.
3. Run `pnpm dev:next` for the website at http://localhost:3000.
4. Run `pnpm dev:bot` separately when working on Discord features. `pnpm dev` starts both services.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm test` | Run all local regression tests using mocked services |
| `pnpm test:bot` | Run the bot, onboarding and marketplace regression subset |
| `pnpm lint` | Check TypeScript, React and JavaScript conventions |
| `pnpm build` | Generate Prisma Client and build the production website |
| `pnpm start` | Serve the production website |
| `pnpm audit --prod` | Audit locked production dependencies |
| `pnpm db:status` | Inspect database migration status |
| `pnpm db:deploy` | Apply committed migrations to the configured database |
| `pnpm db:migrate` | Create and apply development migrations |

## Repository layout

- `app/`: pages, layouts, API handlers and route-specific components.
- `components/`, `contexts/`, `lib/`, `types/`: shared UI, providers, application services and types.
- `bot/`: Discord Gateway worker and standalone HTTP integrations.
- `prisma/`: authoritative database schema, migration history and seed utilities.
- `scripts/`: regression tests, operational checks, maintenance tools and message previews.
- `public/`: static assets, PWA service worker and offline page.

Generated dependencies, build outputs, logs, editor settings and local environment files are ignored. Prisma Client and its native engine are generated under `node_modules`; do not copy engine binaries into `lib/`. Preview scripts generate ignored files in `artifacts/previews/`.

## Configuration and deployment

Start with `.env.example` and the runtime requirements in `lib/env.ts` and `bot/runtime.js`. See the [database workflow](prisma/README.md) and [maintenance scripts](scripts/README.md).

Production uses the website and one Discord worker declared in `vercel.json` and `Dockerfile.discord`. The Vercel worker does not accept inbound HTTP requests. Run tests, lint, build and audit before a release. Verify production variables and pending migrations separately; builds do not apply migrations. Pushing `main` triggers the linked Vercel production deployment.
