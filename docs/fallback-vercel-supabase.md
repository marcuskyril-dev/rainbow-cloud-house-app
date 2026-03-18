# Fallback Strategy: Vercel + Supabase

If AWS free tier blocks development progress, use this fallback architecture. The frontend remains identical; only the backend and deployment targets change.

## When to Fallback

- Cognito costs exceed free tier (50,000 MAU free)
- DynamoDB throughput limits are hit
- Amplify build minutes exhausted
- Development velocity blocked by AWS configuration complexity

## Fallback Architecture

| Component  | AWS (Primary)     | Fallback           |
|-----------|-------------------|--------------------|
| Frontend  | Amplify Hosting   | Vercel (Vite + React SPA) |
| Database  | DynamoDB          | Supabase PostgreSQL |
| Auth      | Cognito           | Supabase Auth (email/password, admin-only) |
| API       | Lambda + API Gateway | Supabase Edge Functions (Deno) |
| Storage   | S3                | Supabase Storage (S3-compatible) |

## Schema Translation (DynamoDB → Postgres)

```sql
CREATE TABLE wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- cents
  image_url TEXT,
  product_url TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','partially_funded','funded','archived')),
  total_contributed INTEGER NOT NULL DEFAULT 0,
  reserved_by_name TEXT,
  is_split_gift BOOLEAN DEFAULT false,
  category TEXT,
  priority TEXT DEFAULT 'must_have',
  metadata JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES wishlist_items(id),
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, normalized_name)
);

CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES wishlist_items(id),
  contributor_name TEXT NOT NULL,
  normalized_contributor_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE idempotency_keys (
  request_id UUID PRIMARY KEY,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Key Differences

- **Unique constraints** native in Postgres (no need for lock table)
- **Transactions** via `BEGIN`/`COMMIT` instead of `TransactWriteItems`
- **Row-level security (RLS)** policies for admin vs public access
- **Same API contract shapes** maintained via Edge Functions

## Migration Path

- Keep frontend code identical
- Swap API base URL via environment variable
- Adapter pattern in API client layer abstracts backend differences
