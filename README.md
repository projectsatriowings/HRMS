# HRMS — Enterprise Platform Monorepo

Internal Human Resource Management System (HRMS) built for our company, architected to scale into a multi-tenant SaaS for Indian SMEs.

---

## 1. Architecture Overview

- **Monorepo Engine**: `pnpm` workspaces (v12.10.1) orchestrated by `Turborepo` (v2).
- **Backend API (`apps/api`)**: NestJS v11 with global prefix `/api`, CORS, validation pipes, and modular domain architecture.
- **Frontend App (`apps/web`)**: Next.js v15 (App Router, React 19) with Tailwind CSS and health status diagnostics.
- **Database Engine (`packages/database`)**: PostgreSQL with Prisma ORM v6, strictly scoped multi-tenancy (`companyId`), and versioned SQL migrations.
- **Shared Contracts (`packages/shared-types`)**: Centralized TypeScript enums (`Role`, `AttendanceStatus`, `LeaveRequestStatus`, etc.) and DTO interfaces.
- **Base Tooling (`packages/tsconfig`)**: Strict, shared TypeScript configurations across packages.

---

## 2. Managed PostgreSQL Setup (Neon vs. Supabase)

### Comparison & Recommendation
| Feature | Neon PostgreSQL (Recommended) | Supabase PostgreSQL |
| :--- | :--- | :--- |
| **Setup Simplicity** | **Highest** — 1-click create project, copy pooled URL | Medium — Provides Postgres + Auth/Storage/Realtime |
| **Connection Pooling** | Built-in serverless pooling (PgBouncer) | Built-in Supavisor pooling |
| **Prisma Compatibility** | 100% native PostgreSQL standard | 100% native PostgreSQL standard |
| **Free Tier** | 0.5 GiB storage, scale-to-zero | 500 MB storage, pauses after 7 days inactivity |
| **Branching** | Instant zero-copy DB branching | Database branching available via CLI |

**Recommendation**: **Neon** is recommended as the simplest, cleanest choice for pure Prisma development. Both services use standard PostgreSQL connection URIs, so you can choose either without changing any application code.

### Step-by-Step Setup:
1. Sign up at [neon.tech](https://neon.tech) (or [supabase.com](https://supabase.com)) and create a free project named `hrms-dev`.
2. Copy your PostgreSQL connection string.
3. In the root directory, create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
4. Paste your connection string into `DATABASE_URL` (pooled) and `DIRECT_URL` (direct):
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   DIRECT_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

---

## 3. Database Migration & Fictional Seed Data

> **IMPORTANT**: Never enter real employee data or credentials into the development database. Use only fictional seed data.

### Run Initial Migration:
Apply the versioned migration (`20261010000000_init`):
```bash
pnpm db:migrate
```
> **CRITICAL RULE**: Never run `prisma migrate reset`, delete, or overwrite the database without explicit approval. All database schema evolutions must be tracked through versioned migrations (`prisma migrate dev` / `prisma migrate deploy`).

### Seed Synthetic Fictional Profiles:
```bash
pnpm db:seed
```

### Fictional Development Accounts:
| Name & ID | Email | Role | Department | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Priya Sharma** (`ACME-001`) | `priya.hr@acme-example.test` | `HR_ADMIN` | Human Resources | `Password123!` |
| **Rajesh Kumar** (`ACME-002`) | `rajesh.manager@acme-example.test` | `MANAGER` | Engineering | `Password123!` |
| **Ananya Iyer** (`ACME-003`) | `ananya.dev@acme-example.test` | `EMPLOYEE` | Engineering | `Password123!` |

---

## 4. Development Workflow

### Start All Services (Next.js & NestJS concurrently):
```bash
pnpm dev
```
- **Frontend Web**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Health Diagnostics**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### Quality Assurance Commands:
```bash
# Build all apps and packages:
pnpm build

# Run type checks across all workspaces:
pnpm type-check

# Run linter across all workspaces:
pnpm lint

# Run automated tests:
pnpm test
```

