# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This project is a **Portale Gestione Prenotazioni Concessionaria** — a professional car dealership booking and inventory management portal in Italian.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/concessionaria) at previewPath "/"
- **API framework**: Express 5 (artifacts/api-server) at previewPath "/api"
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **UI**: Tailwind CSS + Shadcn/ui components + React Query

## Authentication

The portal uses server-side session authentication (express-session + SESSION_SECRET env var).

Default credentials:
- **Username**: `admin`
- **Password**: `AutoFlotta2025`

Customize credentials via environment variables:
- `PORTAL_USERNAME` — override default username
- `PORTAL_PASSWORD` — override default password

Sessions last 8 hours. All API routes (except `/api/auth/*` and `/api/healthz`) are protected.

## Application Features

- **Inventario Vetture** (`/inventario`) — vehicle inventory with filters (fuel type, condition, brand, availability, plate search). CRUD for vehicles with photo upload.
- **Calendario** (`/calendario`) — monthly/weekly calendar with colored booking bars per vehicle. Color-coded by status (attiva=green, in_corso=blue, completata=grey, annullata=red).
- **Prenotazioni** (`/prenotazioni`) — booking list with status filters, create/edit bookings with full pricing system (daily rate × days + extra km + deposit - discount = total, live preview), rientro tracking (actual return date, km, damage notes).
- **Clienti** (`/clienti`) — client directory with automatic reliability label (Affidabile/Da monitorare/Problematico), full profile sheet with KPI stats (total rentals, delays, damages, total spent), rental history, contracts/payment status, editable notes.
- **Contratti** (`/contratti`) — contract archive with status management. Types: vendita/noleggio/leasing/permuta.
- **Manutenzioni** (`/manutenzioni`) — vehicle maintenance log.
- **Dashboard** (`/dashboard`) — KPI overview, fleet status board, today's activity alerts.
- **Storico Vetture** (`/storico-vetture`) — per-vehicle history with photo gallery and maintenance log.
- **Report** (`/report`) — advanced statistics and charts: monthly revenue bar chart (last 12 months), contract distribution pie chart by type, top-5 vehicles by contracts, and KPI cards (total revenue, contract count, average amount).

## Database Tables

- `vetture` — vehicles (marca, modello, anno, targa, carburante, stato, colore, prezzo, km, disponibile, note)
- `clienti` — customers (nome, cognome, email, telefono, codiceFiscale, indirizzo, note)
- `prenotazioni` — bookings (vetturaId, clienteId, dataInizio, dataFine, stato, note)
- `contratti` — contracts (vetturaId, clienteId, prenotazioneId, numero, tipo, dataContratto, importo, archiviato, note)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/concessionaria run dev` — run frontend locally

## API Routes

All routes under `/api`:
- `/api/vetture` — CRUD vetture + `/api/vetture/:id/storico`
- `/api/clienti` — CRUD clienti + `/api/clienti/:id/storico`
- `/api/prenotazioni` — CRUD prenotazioni
- `/api/contratti` — CRUD contratti
- `/api/dashboard/stats` — dashboard statistics
- `/api/dashboard/prenotazioni-calendario` — calendar bookings by month
- `/api/dashboard/report` — advanced report: monthly revenue, top vehicles, contract type distribution, KPI totals

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
