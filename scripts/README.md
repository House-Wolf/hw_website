# Scripts

Run commands from the repository root. `pnpm test` runs every `test-*.mjs` regression file using Node's test runner. The tests mock external services and do not apply migrations, post Discord messages or change live roles.

## Operational checks

| Script | Purpose |
| --- | --- |
| `prisma-env.mjs` | Load local environment files before Prisma status/deploy commands |
| `verify-personnel-migration.mjs` | Verify the personnel database structures |
| `verify-personnel-assignment-lock.mjs` | Exercise database assignment locks using synthetic identifiers |
| `configure-personnel-commands.mjs` | Configure personnel command access mappings |
| `check-db.ts` | Inspect users and linked authentication accounts |
| `verify-divisions.ts`, `verify-division-slugs.ts` | Inspect division records and slugs; the slug tool repairs only with `--fix` |
| `verify-subdivision-patches.ts` | Inspect subdivision patch mappings |

Maintenance tools require the intended database environment. They are separate from the regression tests. The assignment-lock check uses real database transactions; command configuration writes mappings. Inspect each tool before running it against production.

## Seed and repair tools

`seed-subdivisions.ts` and `update-subdivision-patches.ts` write subdivision data. Division/rank/category tools are in `prisma/`. TypeScript tools use the installed `ts-node` runner and need `DATABASE_URL` supplied explicitly or in the environment their Prisma client reads. They do not all use the Next.js environment loader.

## Message previews

Run `node scripts/preview-promotion-post.mjs` or `node scripts/preview-promotion-review.mjs` to generate local Discord message previews. Output goes to the ignored `artifacts/previews/` directory. The renderers currently reference the Windows Segoe UI font; adjust the font path when running elsewhere. Preview generation does not send messages.
