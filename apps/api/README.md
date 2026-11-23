# @file-sharer/api

Backend API for file-sharer. It manages file transfers: metadata lives in Postgres (Drizzle) and file chunks are stored in Cloudflare R2 through presigned upload URLs. Built with Bun and Hono.

## Structure

- `src/domain` – core entities and rules (transfers, chunk keys, expiry, errors)
- `src/interfaces` – ports (clock, ID generator, password hasher, repository, upload URL signer, …)
- `src/services` – use cases (`transfer-service`)
- `src/adapters` – implementations of the ports (Drizzle, R2, Bun hasher, system clock, secure IDs)
- `src/config/env.ts` – validates environment variables with zod; fails fast with a readable error

## Configuration

Copy `.env.example` to `.env` in the repo root. Scripts load that file.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | – | Postgres connection string |
| `R2_ACCOUNT_ID` | – | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | – | R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | – | R2 secret access key |
| `R2_BUCKET_NAME` | – | R2 bucket name |
| `PORT` | `4000` | Port the API listens on |
| `WEB_ORIGIN` | `http://localhost:3000` | Allowed web app origin (CORS) |

## Scripts

```sh
bun run dev        # watch mode
bun run start      # run once
bun run build      # bundle to dist/
bun run typecheck  # tsc --noEmit
```
