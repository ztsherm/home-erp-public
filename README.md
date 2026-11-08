# Home ERP

Home ERP is a self-hosted household ERP built with Next.js App Router, TypeScript, Prisma, PostgreSQL, Auth.js credentials auth, and Tailwind CSS.

It is organized as a platform foundation:

- `src/server`: database and authenticated household context
- `src/features`: module-owned queries, actions, and domain logic
- `src/components`: reusable shell, forms, tables, and record surfaces
- `src/config/modules.ts`: navigation and module registry
- `prisma/schema.prisma`: full V1 relational schema

## Local setup

```bash
npm install
copy .env.example .env
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

The seed creates the initial administrator from `INITIAL_ADMIN_NAME`,
`INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD`. `INITIAL_ADMIN_PIN` is
optional and has no default. The administrator is linked to a generic People
record with the `Immediate Family` relationship. The seed creates no sample
people, locations, rooms, areas, inventory, transactions, workflows, or reports.

## Environment

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DATABASE_POOL_MAX="5"
AUTH_SECRET="replace-with-a-long-random-secret"
AUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
INITIAL_ADMIN_NAME="Administrator"
INITIAL_ADMIN_EMAIL="admin@example.com"
INITIAL_ADMIN_PASSWORD="set-this-outside-source-control"
INITIAL_ADMIN_PIN=""
```

Use `DATABASE_POOL_MAX="1"` with the local Prisma development database proxy. For hosted PostgreSQL, start at `5` and tune it to the provider's connection limits and the number of application instances.

## Checks

```bash
npm run lint
npm test
npm run build
```

## Deployment

Use a hosted PostgreSQL database such as Neon. Set the environment variables in Vercel, run `npm run db:deploy` against production, then deploy the app.

For durable item photos and file attachments, connect a Vercel Blob store to the project. Vercel injects `BLOB_READ_WRITE_TOKEN` automatically. Local development falls back to `public/uploads` when this variable is absent.
