# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router code. User-facing marketplace pages live in `app/(root)/marketplace`; authenticated dashboard flows in `app/(dashboard)/dashboard/*`. API routes reside under `app/api/*`.
- `components/`, `hooks/`, `lib/`: Shared UI, hooks, and helpers (auth, rate limits, storage/R2 client, permissions).
- `bot/`: Discord bot service used for marketplace threads and guild role handling.
- `prisma/`: Schema and migrations; run Prisma commands from repo root.
- `public/`, `docs/`, `scripts/`, `types/`: Static assets, internal docs, utility scripts, shared types.

## Build, Test, and Development Commands
- `pnpm install`: Install deps (Node 22+). Uses `pnpm-lock.yaml`.
- `pnpm dev`: Run Next.js dev server and bot concurrently (`dev:next`, `dev:bot`).
- `pnpm build`: Generate Prisma client then build Next.js.
- `pnpm start`: Start the production build.
- Database helpers: `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:push`, `pnpm db:seed`, `pnpm db:studio`.
- Lint: `pnpm lint`.

## Coding Style & Naming Conventions
- TypeScript/React (App Router). Prefer functional components and hooks.
- Formatting: keep imports ordered, avoid unused symbols; run `pnpm lint` before pushing. Tailwind is configured via `tailwind.config.ts`.
- Naming: files in `app/` use Next.js segment naming; shared utilities in `lib/` are camelCase; React components PascalCase.
- Env: use `.env` (see `.env.example`); never commit secrets.

## Testing Guidelines
- No formal test suite present; add targeted tests when touching risky logic (API validation, rate limits, auth) using the project’s chosen test runner (none configured—introduce one locally if needed).
- For API changes, exercise routes via `pnpm dev` plus curl/Thunder Client; confirm rate-limit headers and expected status codes.

## Security & Configuration Tips
- Required envs: Discord OAuth/roles, R2 storage, NextAuth secret, database URL. Use `/api/test-r2` to verify R2 connectivity.
- Middleware (`proxy.ts`) protects `/dashboard`, `/api/marketplace/*`, and user APIs. Keep new protected routes in sync.
- Image uploads must be `multipart/form-data` to `/api/upload/image`; listing create/update expects JSON.

## Commit & Pull Request Guidelines
- Commits: concise, imperative subjects (e.g., “Fix marketplace image upload error handling”); group related changes.
- PRs: describe scope, risks, and validation steps; link issues; add screenshots for UI changes; call out env or migration impacts.
