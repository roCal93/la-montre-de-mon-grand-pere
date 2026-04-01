// Compatibility endpoint for local Stripe CLI forwarding (`--forward-to localhost:3000/webhook`).
// Reuse the canonical Stripe webhook handler.
// Note: route segment config must be declared inline — re-exports are not supported by Next.js.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export { POST } from '@/app/api/webhooks/stripe/route'
