// Compatibility endpoint for local Stripe CLI forwarding (`--forward-to localhost:3000/webhook`).
// Reuse the canonical Stripe webhook handler.
export { runtime, dynamic, POST } from '@/app/api/webhooks/stripe/route'
