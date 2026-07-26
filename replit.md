# Koinonia Camp Registration

A warm, modern camp registration app for Gracefields Chapel's Koinonia Camp 2026 (Sept 18–21, "Prepare to meet thy God"). Members register via a public multi-step form; organisers manage attendees via a private admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/koinonia-camp run dev` — run the frontend (managed via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, React Query, Wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/registrations.ts` — registrations table definition
- `artifacts/api-server/src/routes/registrations.ts` — all registration endpoints
- `artifacts/koinonia-camp/src/` — React frontend

## Architecture decisions

- Phone + full name (case-insensitive) is the unique identifier for upsert — phone alone is NOT unique (family members share phones)
- Ministries stored as comma-separated text column (not pg array) for simplicity; converted to/from array in the API layer
- Reference number format: `KOI26-XXXXXX` (6 random digits)
- Future fields (paymentStatus, roomAssignment, busAssignment) are in the DB schema now but not exposed in Phase 1 UI
- Admin dashboard is at `/admin` — no authentication in Phase 1

## Product

- `/` — Public 3-step registration form (Personal Info → Church Info → Preferences) with animated confirmation screen and reference number
- `/admin` — Admin dashboard with live stats cards, searchable/filterable table of all registrants, and Excel export

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any `lib/*` schema change, run `pnpm run typecheck:libs` before checking artifact packages — stale lib declarations cause false import errors
- After any OpenAPI spec change, re-run codegen before writing routes or frontend code
- The stats endpoint (`/registrations/stats`) must be registered BEFORE `/:id` in Express to avoid route conflicts
