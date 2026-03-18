# Implementation Playbook

A playbook for LLM agents implementing features in the Rainbow Cloud House Wishlist project.

---

## Project Context

**App**: Housewarming wishlist web app MVP. Guests can view items, reserve them, or contribute money toward split gifts. Admins manage items via a protected dashboard.

**Scale**: ~10–20 items, low traffic. No heavy scaling concerns.

**Tech stack**:
- Frontend: Vite 7, React 19, Tailwind CSS v4, Radix UI, TanStack Query, React Hook Form, zod
- Backend: AWS API Gateway, Lambda (Node.js), DynamoDB, S3, Cognito

---

## Design Token Reference

| Token | Value |
|-------|-------|
| Olive | `#A3A074` |
| Dusty blue | `#5B7C8D` |
| Warm beige | `#EAD9A0` |
| Font | Fredoka 400/700 |
| Radius | 8px default, pill (`100px`) for buttons |
| Background | White |
| Text primary | `#121212` |
| Text secondary | `#999999` |

Tailwind theme tokens are defined in `src/index.css` via `@theme` (e.g. `--color-olive`, `--radius-md`, `--font-display`).

---

## Architecture Rules

- **Feature-first**: One folder per feature under `src/features/` (e.g. `public-wishlist`, `reservations`, `contributions`, `admin-items`, `auth`).
- **Shared UI**: Radix primitives wrapped in `src/shared/ui/`. Export from `src/shared/ui/index.ts`.
- **API client**: Typed wrappers in `src/shared/api/`. Never call `fetch` directly from components.
- **Server state**: TanStack Query only. No Redux or other global state stores.
- **Forms**: React Hook Form + zod for all forms.
- **Money**: Store in cents; display with `formatCurrency(cents)` from `src/shared/lib/format.ts`.
- **Tailwind**: Use theme tokens from `@theme` in `src/index.css`.

---

## Coding Conventions

- **TypeScript**: Strict mode, no `any`.
- **Exports**: Named exports only; default export only for `App`.
- **Components**: PascalCase files (e.g. `ItemCard.tsx`).
- **Hooks**: `useXxx` pattern, placed in `src/shared/hooks/`.
- **API**: All API calls go through typed wrappers in `src/shared/api/`.
- **Errors**: Catch `ApiClientError`, surface user-friendly messages based on `code` and `message`.
- **Idempotency**: Generate `requestId` (UUID v4) for all mutating public endpoints (reserve, contribute).

---

## Common Patterns

### Creating a new UI component

1. Add file in `src/shared/ui/` (e.g. `MyComponent.tsx`).
2. Wrap Radix primitives when relevant.
3. Export from `src/shared/ui/index.ts`.

### Adding a new feature

1. Create `src/features/<feature-name>/`.
2. Add `components/`, hooks, and `index.ts`.
3. Export public API from `index.ts`.
4. Wire into router in `App.tsx`.

### Adding a new API endpoint

1. Add function in `src/shared/api/` (e.g. `items.ts`, `reservations.ts`).
2. Create TanStack Query hook in `src/shared/hooks/`.
3. Use hook in feature components.
4. Invalidate related queries on success.

---

## Lambda Handler Pattern

For each Lambda handler in `infra/lambda/src/handlers/`:

1. **Parse**: Read `event.body`, `event.pathParameters`, `event.queryStringParameters`.
2. **Validate**: Run input through zod schema. Return 400 if invalid.
3. **Idempotency** (public writes: reserve, contribute):
   - Check `IdempotencyKeys` for `requestId`.
   - If found with same payload → return cached response.
   - If found with different payload → return 409 `IDEMPOTENCY_CONFLICT`.
4. **DynamoDB**: Use `TransactWriteItems` for multi-entity writes; keep reads outside transaction when possible.
5. **Response**: Use shared helpers (e.g. `success()`, `error()`) from `infra/lambda/src/shared/response.ts`.
6. **CORS**: Ensure response includes required CORS headers.
