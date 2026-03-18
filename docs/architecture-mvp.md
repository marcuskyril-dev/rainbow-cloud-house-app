# Rainbow Cloud House Wishlist — Architecture (MVP)

## High-Level Architecture

The housewarming wishlist MVP is a full-stack web application built on AWS serverless infrastructure with a modern React SPA frontend.

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite + React 19 + Tailwind CSS + Radix UI (SPA) |
| **Backend** | AWS API Gateway (REST) + AWS Lambda (Node.js) |
| **Database** | AWS DynamoDB (single-table + 2 auxiliary tables) |
| **Auth** | AWS Cognito (admin-only) |
| **Storage** | AWS S3 (item images) |
| **Hosting/CI** | AWS Amplify |

**Fallback:** Vercel (frontend) + Supabase (backend/database) if AWS free tier limits block progress.

---

## Runtime Flow

### Public Users (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List all wishlist items |
| POST | `/reserve` | Reserve an item (name lock) |
| POST | `/contribute` | Contribute funds toward an item |

### Admin Users (Cognito JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/items` | Create new item |
| PUT | `/items/:id` | Update item |
| DELETE | `/items/:id` | Delete item |
| POST | `/items/:id/metadata-fetch` | Fetch OG metadata from URL, optionally mirror image to S3 |

**Invariant enforcement:** All write invariants (reservability, contribution limits, idempotency) are enforced by Lambda handlers. The frontend does not assume authority for business rules.

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PUBLIC CLIENT (SPA)                               │
│  Vite + React 19 + Tailwind + Radix UI + TanStack Query + React Hook Form   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS (no auth)
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN CLIENT (SPA)                                │
│  Same stack + Cognito Auth Provider (JWT in Authorization header)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTPS + JWT
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWS API GATEWAY (REST)                              │
│  Routes: /items, /reserve, /contribute, /items/:id/metadata-fetch           │
│  Auth: JWT authorizer for admin endpoints                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Integration
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AWS LAMBDA (Node.js)                                │
│  Handlers: getItems, createItem, updateItem, deleteItem, reserveItem,        │
│           contributeToItem, fetchMetadata, getPresignedUploadUrl             │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────┐
│   AWS DynamoDB        │  │   AWS S3             │  │   External URLs       │
│   Single-table + 2    │  │   Item images        │  │   (metadata scrape)   │
│   auxiliary tables    │  │   (presigned URLs)   │  │                       │
└───────────────────────┘  └───────────────────────┘  └───────────────────────┘
```

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Vite SPA over Next.js SSR** | No SEO required; simpler build and deployment. Static hosting with Amplify/Vercel. |
| **Single-table DynamoDB + aux tables** | Production-safe concurrency via conditional writes and transactions, with minimal schema complexity. |
| **Feature-first frontend modules** | Colocation of related logic, UI, and hooks. Easier discovery and maintenance than file-type separation. |
| **TanStack Query for server state** | Optimistic updates, cache invalidation, and request deduplication out of the box. |
| **React Hook Form + zod** | Shared validation schemas between client and API. Type-safe forms and consistent error handling. |

---

## Directory Structure

```
├── src/
│   ├── features/
│   │   ├── public-wishlist/     # Public view of items
│   │   ├── admin-items/         # CRUD for admin
│   │   ├── reservations/        # Reserve flow (public)
│   │   ├── contributions/       # Contribute flow (public)
│   │   └── auth/                # Cognito login/logout, JWT handling
│   ├── shared/
│   │   ├── ui/                  # Radix primitives, shared components
│   │   └── api/                 # API client, base URLs, types
│   └── App.tsx
├── infra/
│   ├── amplify/                 # Amplify config, env
│   ├── lambda/                  # Lambda source, handlers
│   └── api-gateway/             # OpenAPI / SAM / CDK definitions
├── docs/
│   ├── architecture-mvp.md
│   └── system-sequences.md
└── .cursor/
    └── skills/                 # Project-specific agent skills
```

---

## Data Model (DynamoDB)

- **Main table:** Items, reservations, contributions, and name locks stored with composite keys (e.g. `PK`, `SK`) for single-table design.
- **Auxiliary tables:** Dedicated tables for idempotency keys and other supporting access patterns.
- **S3:** Item images stored by `itemId`; URLs stored in item records.
