# Avikontex CRM Frontend

Frontend for Avikontex CRM (admin/developer panel only).

## Source of Truth

The live OpenAPI schema is the backend source of truth:

- `https://api.avikontex.cognilabs.org/api/docs/`
- `https://api.avikontex.cognilabs.org/api/schema/`

Live mode exposes only modules present in that schema. Mock mode is opt-in with
`VITE_USE_MOCK_API=true`.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
```

## Scope

- Includes: CRM admin/developer pages
- Excludes: Telegram WebApp (separate project)

Current live modules: dashboard, clients, chats, users, integrations, AI
settings, audit logs, and health. Leads, products, contracts, notifications,
and operator KPI remain unavailable until the backend exposes their APIs.

