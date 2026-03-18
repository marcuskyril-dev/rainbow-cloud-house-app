# Frontend Architecture

This document describes the frontend architecture of the housewarming wishlist web app MVP.

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19 + TypeScript (strict mode) |
| **Build Tool** | Vite 7 (dev server + build) |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/vite` plugin, `@theme` in CSS) |
| **UI Primitives** | Radix UI (Dialog, Tabs, Select, Progress, Avatar, Label, Tooltip) |
| **Server State** | TanStack Query v5 |
| **Forms** | React Hook Form + zod (validation) |
| **Routing** | React Router DOM v7 (client-side) |
| **Icons** | Lucide React |

## Directory Structure

```
src/
├── features/
│   ├── public-wishlist/        # Main public-facing page
│   │   ├── components/
│   │   │   ├── WishlistHeader.tsx
│   │   │   ├── FilterTabs.tsx
│   │   │   └── ItemCard.tsx
│   │   ├── WishlistPage.tsx
│   │   └── index.ts
│   ├── admin-items/            # Admin CRUD dashboard
│   │   ├── components/
│   │   │   ├── AdminItemCard.tsx
│   │   │   └── AddEditItemModal.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── index.ts
│   ├── reservations/           # Reserve item flow
│   │   ├── components/
│   │   │   └── ReserveModal.tsx
│   │   └── index.ts
│   ├── contributions/          # Contribute flow + history
│   │   ├── components/
│   │   │   ├── ContributeModal.tsx
│   │   │   └── ContributionHistoryModal.tsx
│   │   └── index.ts
│   └── auth/                   # Admin authentication
│       ├── components/
│       │   └── LoginForm.tsx
│       ├── AuthContext.tsx
│       ├── ProtectedRoute.tsx
│       └── index.ts
├── shared/
│   ├── api/                    # API client layer
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── client.ts           # Base fetch client
│   │   ├── items.ts            # Items API functions
│   │   ├── reservations.ts     # Reserve API
│   │   ├── contributions.ts    # Contribute API
│   │   └── index.ts
│   ├── hooks/                  # TanStack Query hooks
│   │   ├── useItems.ts
│   │   ├── useReservation.ts
│   │   └── useContribution.ts
│   ├── lib/                    # Utilities
│   │   ├── validation.ts       # Zod schemas
│   │   ├── format.ts           # Currency, date, status formatters
│   │   └── idempotency.ts      # Request ID generation
│   └── ui/                     # Shared UI components
│       ├── Button.tsx
│       ├── Modal.tsx
│       ├── StatusBadge.tsx
│       ├── ProgressBar.tsx
│       ├── Input.tsx
│       ├── Textarea.tsx
│       ├── Select.tsx
│       ├── ContributorAvatar.tsx
│       └── index.ts
├── App.tsx                     # Router + providers
├── main.tsx                    # Entry point
├── index.css                   # Tailwind + design tokens
└── vite-env.d.ts
```

### Feature Modules

- **`features/`** — Feature-specific code organized by domain. Each feature has its own `components/`, main page/container, and `index.ts` for public exports.
- **`shared/`** — Cross-cutting concerns: API client, hooks, utilities, and shared UI components.

## State Management Strategy

| State Type | Tool | Use Case |
|------------|------|----------|
| **Server state** | TanStack Query | Items list, contributions, reservation status |
| **Local UI state** | React `useState` | Modal visibility, form drafts, filter selection |
| **Auth state** | AuthContext | Admin authentication (token, user) |

No Redux or Zustand is needed at this scale. TanStack Query handles caching, refetching, and optimistic updates for all server data.

## Routing

| Route | Component | Access |
|-------|-----------|--------|
| `/` | `WishlistPage` | Public |
| `/admin/login` | `LoginForm` | Public |
| `/admin` | `AdminDashboard` | Protected (requires auth) |

`ProtectedRoute` wraps `/admin` and redirects unauthenticated users to `/admin/login`.

## API Client Pattern

- **Base client** (`shared/api/client.ts`) — Central `fetch` wrapper with:
  - Automatic auth header injection (Bearer token for admin endpoints)
  - JSON serialization
  - Error handling with typed `ApiClientError`

- **Feature-specific wrappers** — `items.ts`, `reservations.ts`, `contributions.ts` expose typed functions that use the base client.

- **Idempotency** — Public write endpoints (reserve, contribute) use a `requestId` header for safe retries; `shared/lib/idempotency.ts` provides request ID generation.

- **Error handling** — `ApiClientError` carries HTTP status and parsed body for consistent error display in the UI.

## Form Pattern

- **React Hook Form** with **zodResolver** for validation
- Shared validation schemas in `shared/lib/validation.ts`
- Consistent error display via `error` prop on `Input` and `Textarea`
- Form components use `register`, `control`, and `handleSubmit` from React Hook Form with zod schemas
