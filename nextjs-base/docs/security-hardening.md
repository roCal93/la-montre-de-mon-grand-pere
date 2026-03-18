# Security Hardening

This document explains the API hardening included in the starter and how to configure it in production.

## Scope

The starter includes hardening for the public contact endpoint:

- `src/app/api/contact/route.ts`

It now uses shared security utilities:

- `src/lib/public-api-security.ts`
- `src/lib/rate-limit.ts`

Client projects that add extra public write endpoints (for example reservation flows) should reuse the same utilities.

## Protections Implemented

### 1. Origin and referer validation

`enforcePublicApiOrigin(request)`:

- allows same-origin requests (`request.nextUrl.origin`)
- optionally allows additional domains via `PUBLIC_API_ALLOWED_ORIGINS`
- returns `403` for unauthorized origins/referers

### 2. Rate limiting (distributed + fallback)

`checkRateLimit(...)`:

- uses Upstash Redis REST when configured
- falls back to in-memory rate limiting if Upstash is unavailable or not configured
- returns standard metadata on throttled responses:
  - `Retry-After`
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Source` (`upstash` or `memory`)

## Environment Variables

Configure in Vercel (`Project -> Settings -> Environment Variables`):

```env
UPSTASH_REDIS_REST_URL=https://<your-db-endpoint>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-token>
PUBLIC_API_ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com
```

Notes:

- Upstash variables are optional but strongly recommended in production.
- If missing, limiter still works with memory fallback (less robust in multi-instance serverless).
- Same-origin is always allowed automatically.

## Upstash Setup

1. Create an Upstash Redis database.
2. For rate-limiter-only usage, enabling `Eviction` is acceptable.
3. Copy values from Upstash dashboard:

- `REST URL` -> `UPSTASH_REDIS_REST_URL`
- `REST TOKEN` -> `UPSTASH_REDIS_REST_TOKEN`

## Verification Checklist

1. Send valid POST request from allowed origin -> request accepted (`200`/`400` depending on payload validity).
2. Send request from unauthorized origin -> `403`.
3. Exceed request limit quickly -> `429` with rate-limit headers.
4. Ensure `X-RateLimit-Source: upstash` in production.

## Reuse In Variants / Client Projects

For any new public POST endpoint:

1. Call `enforcePublicApiOrigin(request)` at the top of the handler.
2. Derive IP with `getClientIpFromHeaders(request.headers)`.
3. Call `checkRateLimit(...)` with endpoint-specific key and limits.
4. Return `429` with `Retry-After` + rate-limit headers on throttle.
