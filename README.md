# Housewarming Wishlist

A housewarming wishlist web app where friends and family can view, reserve, and contribute to gifts for a new home.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS v4, Radix UI, TanStack Query, React Hook Form, zod

**Backend:** AWS API Gateway, Lambda (Node.js), DynamoDB, S3, Cognito

**Hosting:** AWS Amplify

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app runs at `http://localhost:5173`.

## Project Structure

```
src/
├── features/           # Feature modules
│   ├── public-wishlist/ # Main wishlist page
│   ├── admin-items/     # Admin CRUD dashboard
│   ├── reservations/    # Reserve item modal
│   ├── contributions/   # Contribute modal + history
│   └── auth/            # Admin login
├── shared/
│   ├── api/            # Typed API client
│   ├── hooks/          # TanStack Query hooks
│   ├── lib/            # Utilities, validation, formatters
│   └── ui/             # Shared UI components
infra/
├── lambda/             # Lambda handlers
├── api-gateway/        # SAM template
docs/                   # Architecture, API, and schema docs
.cursor/skills/         # Cursor AI skills for this project
```

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture-mvp.md) | High-level system design |
| [System Sequences](docs/system-sequences.md) | Flow diagrams for all operations |
| [DynamoDB Schema](docs/dynamodb-schema.md) | Table definitions and entity shapes |
| [Access Patterns](docs/access-patterns.md) | Query patterns and concurrency control |
| [API Spec](docs/api/openapi.yaml) | OpenAPI 3.0 specification |
| [Error Model](docs/api/error-model.md) | Error codes and response format |
| [Auth Flow](docs/auth-flow.md) | Cognito admin authentication |
| [Frontend Architecture](docs/frontend-architecture.md) | Component structure and patterns |
| [Design Tokens](docs/design-tokens.md) | Colors, typography, spacing |
| [Deployment](docs/deployment.md) | Deploy and CI/CD guide |
| [Fallback Strategy](docs/fallback-vercel-supabase.md) | Vercel + Supabase alternative |

## Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + production build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Design

- **Font:** Fredoka (400, 700)
- **Colors:** Olive (#A3A074), Dusty Blue (#5B7C8D), Warm Beige (#EAD9A0)
- **Buttons:** Pill-shaped (border-radius: 100px)
- **Cards:** 8px border radius

## License

Private project.
