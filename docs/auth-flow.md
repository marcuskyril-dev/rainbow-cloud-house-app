# Auth Flow: Admin-Only Authentication (AWS Cognito)

This document describes the complete authentication flow for the housewarming wishlist admin interface using AWS Cognito.

## Cognito Setup

- **User Pool** with email as username
- **App Client** (SPA — no client secret)
- **User group**: `admin`
- **Pre-created admin accounts only** — no public sign-up enabled

## Auth Flow Steps

1. Admin navigates to `/admin` → redirected to login
2. Login form submits credentials via Amplify Auth library (or Cognito Hosted UI)
3. Cognito returns `id_token`, `access_token`, `refresh_token`
4. Frontend stores tokens in memory (AuthContext); `refresh_token` in secure storage
5. All admin API calls include `Authorization: Bearer {id_token}` header
6. API Gateway Cognito Authorizer validates JWT signature + expiry
7. Lambda extracts `cognito:groups` claim and verifies `admin` membership
8. Token refresh handled automatically by Amplify Auth

## Frontend Auth Architecture

- **AuthProvider** context wrapping admin routes
- **useAuth()** hook: `{ user, isAuthenticated, isLoading, signIn, signOut }`
- **ProtectedRoute** component redirects to login if not authenticated
- Token automatically attached to API requests via axios/fetch interceptor

## Security Considerations

- No public sign-up endpoint
- Admin accounts created via AWS Console or CLI only
- CORS restricted to app domain
- API Gateway throttling: 100 requests/second burst, 50 sustained
- Public endpoints rate-limited per IP
