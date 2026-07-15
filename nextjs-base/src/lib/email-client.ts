import { Resend } from 'resend'

type SendEmailArgs = {
  from?: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

const apiKey = process.env.RESEND_API_KEY
const defaultFrom =
  process.env.RESEND_FROM_EMAIL ||
  process.env.MAIL_FROM_EMAIL ||
  process.env.ORDER_EMAIL_FROM

function normalizeFromAddress(value: string | undefined | null) {
  const rawValue = value?.trim()
  if (!rawValue) return null

  const plainEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (plainEmailPattern.test(rawValue)) {
    return rawValue
  }

  const formattedPattern = /^.+<\s*[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+\s*>$/
  if (formattedPattern.test(rawValue)) {
    return rawValue.replace(/<\s*/, '<').replace(/\s*>/, '>')
  }

  const emailMatch = rawValue.match(/([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)$/)
  if (!emailMatch) return null

  const email = emailMatch[1]
  const name = rawValue.slice(0, emailMatch.index).trim()

  return name ? `${name} <${email}>` : email
}

export function isEmailConfigured() {
  return Boolean(apiKey && normalizeFromAddress(defaultFrom))
}

export function getEmailConfigurationStatus() {
  const normalizedFrom = normalizeFromAddress(defaultFrom)

  return {
    hasApiKey: Boolean(apiKey),
    hasFromAddress: Boolean(defaultFrom),
    hasValidFromAddress: Boolean(normalizedFrom),
    configured: Boolean(apiKey && normalizedFrom),
  }
}

export function getDefaultFromEmail() {
  return normalizeFromAddress(defaultFrom) || 'contact@votre-domaine.com'
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

  const fromAddress = normalizeFromAddress(from || defaultFrom)
  if (!fromAddress) {
    throw new Error(
      'Sender email is invalid. Use email@example.com or Name <email@example.com>.'
    )
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
