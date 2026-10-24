# Database

`schema.prisma` and the committed SQL migration directories are the database source of truth. Keep historical migrations: existing environments use them to identify applied changes and new environments need them to reproduce the schema.

The schema covers Discord identities and permissions, divisions and member profiles, marketplace listings and guest access, onboarding, personnel promotions, Discord activity, and PackTracker data.

## Workflow

- `pnpm db:generate`: regenerate Prisma Client after schema changes.
- `pnpm db:migrate`: create/apply migrations in development.
- `pnpm db:status`: inspect applied and pending migrations.
- `pnpm db:deploy`: apply committed migrations to the configured environment.
- `pnpm db:studio`: browse the configured database.

The status/deploy commands load `.env.local` through `scripts/prisma-env.mjs`. Direct Prisma commands require `DATABASE_URL` in the shell or `.env`. Production builds generate the client; they do not apply migrations. Review and back up the target database before applying migrations.

Application code imports the singleton from `lib/prisma.ts`. The standalone JavaScript worker owns its own Prisma client. Generated clients and native binaries belong in `node_modules`, not source control.

## Seed and repair utilities

`seed-divisions.ts`, `seed-ranks.ts`, and `seeds/` contain targeted database initialization and category tools. Subdivision and patch utilities live in `scripts/`. These are manual tools; there is no aggregate `db:seed` command. Inspect their changes and configure the target environment before running them.

See [maintenance tools](../scripts/README.md) and the root `.env.example` for configuration.
