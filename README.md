# BrewLite Assignment 2

Assignment 2 continues the BrewLite project. This working tree contains the Task 4.3 MVP Sprint 1 implementation and keeps the existing Task 1–3 materials under [`docs/`](docs/).

## Task 4.3 applications

- `apps/api`: NestJS Products API, reusing the products module and sample catalog from Assignment 1.
- `apps/web`: Next.js menu, which fetches products from the API and renders loading, empty, and retryable error states.
- `docs/`: existing Assignment 1–3 coursework documents and diagrams.

The product sample catalog currently lives in the NestJS service in memory, as it does in Assignment 1. PostgreSQL remains the project database for later persisted features; product persistence and database migrations are outside this Task 4.3 implementation.

## Run locally

Use Node.js and npm. The defaults need no environment file. To change settings, copy `.env.example` to the repository root for the API and to `apps/web/.env.local` for Next.js. Start the API and web app in separate terminals:

```powershell
cd apps/api
npm ci
npm run start:dev
```

```powershell
cd apps/web
npm ci
npm run dev
```

Open `http://localhost:3000`. The API listens on `http://localhost:3001` by default. The menu calls `GET /products`; `GET /products/:id` returns a product or HTTP 404.

## Validation commands

```powershell
# API
cd apps/api
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run lint
npm run build

# Web
cd apps/web
npm test -- --run
npm run lint
npm run build
```

Assignment 2 work is organized around the GitHub Issues and the branch/PR workflow. No CI workflow, Docker Compose deployment, or Task 5 functionality is introduced by this Task 4.3 implementation.
