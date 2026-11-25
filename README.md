# Smart Attendance & Academic Portal

React and TypeScript attendance management for institutions, department heads, faculty and students. Supabase Auth handles sign-in and password recovery. PostgreSQL stores academic records and enforces institutional, departmental and classroom permissions.

Read the [project context and AMC rollout handoff](docs/PROJECT_CONTEXT.md) for the current architecture, deployment state, account setup and remaining work.

## Run locally

```text
npm ci
npm run dev
```

Copy [.env.example](.env.example) to `.env.local` and configure your Supabase URL and publishable key before signing in. See [Supabase setup, migration and database operations](docs/SUPABASE_SETUP.md) for staging, migration, authorized account provisioning and fictional test accounts.

For a standalone demonstration, set `VITE_PORTAL_MODE=demo` and restart Vite. Choose one of the three fictional accounts on the login page. Demo changes live in memory and reset when you reload.

## Verification

```text
npm run build
npm run lint
npm run test:db
npx playwright install chromium
npm run test:auth
```

The database tests execute the migrations and simulate Supabase request roles in PostgreSQL. The browser tests use the Supabase SDK against a fixture Auth/Data API. [Staging verification](docs/SUPABASE_SETUP.md#verify-staging) covers delivery of real invitation and reset emails and end-to-end authentication against your project.
