import { Resend } from 'resend'

type SendEmailArgs = {
  from?: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

const apiKey = process.env.RESEND_API_KEY
const defaultFrom = process.env.RESEND_FROM_EMAIL || process.env.MAIL_FROM_EMAIL

export function isEmailConfigured() {
  return Boolean(apiKey && defaultFrom)
}

export function getDefaultFromEmail() {
  return defaultFrom || 'contact@votre-domaine.com'
}

export async function sendEmail({
  from,
  to,
  subject,
  html,
  replyTo,
}: SendEmailArgs) {
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured.')
  }

  const fromAddress = from || defaultFrom
  if (!fromAddress) {
    throw new Error('RESEND_FROM_EMAIL is missing.')
  }

  const toAddresses = Array.isArray(to) ? to : [to]

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: toAddresses,
    subject,
    html,
    ...(replyTo ? { replyTo } : {}),
  })

  if (error) {
    throw new Error(error.message)
  }

  return data?.id
}
