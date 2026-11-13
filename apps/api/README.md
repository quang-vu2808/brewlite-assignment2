# BrewLite API

NestJS API for the Sprint 1 product catalog. The catalog is held in memory; no database is required for these endpoints. See the repository [README](../../README.md) for setup, environment configuration, team workflow, and the complete local commands.

Run from this directory:

```powershell
npm ci
npm run start:dev
```

Endpoints: `GET /products` and `GET /products/:id`. Product IDs that are not integers return HTTP 400; unknown integer IDs return HTTP 404.

Validation commands:

```powershell
npm run lint
npm test -- --runInBand
npm run build
```
