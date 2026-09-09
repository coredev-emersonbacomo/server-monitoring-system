# Frontend — server monitoring dashboard

React 19 + TypeScript + Vite + Tailwind. Served at http://localhost:5173 by
`npm run dev` (repo root); proxies `/api` + websockets to the backend.

## Commands (run from repo root unless noted)

```powershell
npm run dev       # backend stack + this dashboard with HMR
npm test          # backend Pest suite
```

From `frontend/`:

```powershell
npm run build     # tsc + vite build (also runs in CI)
npm run lint      # eslint .
```

## Backend contract

Typed API client is generated, not hand-written:

```powershell
npm run types     # Scramble exports OpenAPI → api.json → schema.d.ts + models
```

`src/api/` holds the generated client (`api.json` is gitignored — regenerate
after pulling backend route changes). `src/types/models.ts` is generated from
it by `scripts/generate-models.js` — do not edit by hand.
