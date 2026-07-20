import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIpFromHeaders } from '@/lib/rate-limit'
import { enforcePublicApiOrigin } from '@/lib/public-api-security'
import {
  getDefaultFromEmail,
  isEmailConfigured,
  sendEmail,
} from '@/lib/email-client'

const RATE_LIMIT = 3 // Max 3 soumissions
const RATE_LIMIT_WINDOW = 5 * 60 * 1000 // 5 minutes

// Fonction de sanitization/escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  }
  return text.replace(/[&<>"'\/]/g, (char) => map[char] || char)
}

// Validation avancée
function validateInput(data: {
  name: string
  email: string
  message: string
}): { valid: boolean; error?: string } {
  // Longueur des champs
  if (data.name.length > 100) {
    return { valid: false, error: 'Le nom est trop long (max 100 caractères).' }
  }
  if (data.email.length > 255) {
    return {
      valid: false,
      error: "L'email est trop long (max 255 caractères).",
    }
  }
  if (data.message.length > 5000) {
    return {
      valid: false,
      error: 'Le message est trop long (max 5000 caractères).',
    }
  }
  if (data.message.length < 10) {
    return {
      valid: false,
      error: 'Le message est trop court (min 10 caractères).',
    }
  }

  // Patterns suspects (basique)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /<iframe/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(data.name) || pattern.test(data.message)) {
      return { valid: false, error: 'Contenu suspect détecté.' }
    }
  }

  return { valid: true }
}

// Templates multilingues pour les emails
const emailTemplates = {
  fr: {
    subject: 'Confirmation de réception de votre message',
    title: 'Message bien reçu',
    greeting: 'Bonjour',
    body: "J'ai bien reçu votre message et je vous en remercie.",
    closing: 'Je vous répondrai dans les plus brefs délais.',
    thanks: 'Merci pour votre confiance.',
    signature: 'La Montre de Mon Grand-Père',
    footer: 'Cet email est envoyé automatiquement, merci de ne pas y répondre.',
  },
  en: {
    subject: 'Confirmation of receipt of your message',
    title: 'Message received',
    greeting: 'Hello',
    body: 'I have received your message and thank you for it.',
    closing: 'I will get back to you as soon as possible.',
    thanks: 'Thank you for your trust.',
    signature: 'La Montre de Mon Grand-Père',
    footer: 'This email is sent automatically, please do not reply.',
  },
  it: {
    subject: 'Conferma di ricezione del tuo messaggio',
    title: 'Messaggio ricevuto',
    greeting: 'Ciao',
    body: 'Ho ricevuto il tuo messaggio e ti ringrazio.',
    closing: 'Ti risponderò il prima possibile.',
    thanks: 'Grazie per la tua fiducia.',
    signature: 'La Montre de Mon Grand-Père',
    footer:
      'Questa email viene inviata automaticamente, si prega di non rispondere.',
  },
} as const

type Locale = keyof typeof emailTemplates

export async function POST(request: NextRequest) {
  try {
    const originError = enforcePublicApiOrigin(request)
    if (originError) return originError

    const body = await request.json()
    const { name, email, message, consent, locale = 'fr', website } = body

    // 1. Protection Honeypot - Si le champ 'website' est rempli, c'est un bot
    if (website) {
      console.warn('Bot detected via honeypot')
      // Réponse normale pour ne pas alerter le bot
      return NextResponse.json(
        { message: 'Message envoyé avec succès !' },
        { status: 200 }
      )
    }

    // 2. Rate limiting (store distribue si UPSTASH_* configure, sinon fallback memoire)
    const ip = getClientIpFromHeaders(request.headers)
    const rateLimit = await checkRateLimit({
      key: `contact:${ip}`,
      limit: RATE_LIMIT,
      windowMs: RATE_LIMIT_WINDOW,
    })

    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      )

      return NextResponse.json(
        {
          error:
            'Trop de tentatives. Veuillez reessayer dans quelques minutes.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Source': rateLimit.source,
          },
        }
      )
    }

    // Valider la locale
    const validLocale: Locale = ['fr', 'en', 'it'].includes(locale)
      ? locale
      : 'fr'
    const template = emailTemplates[validLocale]

    // 3. Validation basique
    if (!name || !email || !message || !consent) {
      return NextResponse.json(
        {
          error:
            'Tous les champs sont obligatoires et le consentement doit être accordé.',
        },
        { status: 400 }
      )
    }

    // 4. Validation email
    const emailRegex = /^[^\s@]+@[^\s@.]+\.[^\s@.]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide.' },
        { status: 400 }
      )
    }

    // 5. Validation avancée (longueur, contenu suspect)
    const validation = validateInput({ name, email, message })
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // 6. Sanitization - échapper les caractères HTML dangereux
    const sanitizedName = escapeHtml(name.trim())
    const sanitizedEmail = escapeHtml(email.trim())
    const sanitizedMessage = escapeHtml(message.trim())

    // Vérifier si Resend est configuré
    if (!isEmailConfigured()) {
      console.warn('Resend not configured. Email not sent.')
      return NextResponse.json(
        {
          success: true,
          message:
            'Message reçu (mode démo - email non envoyé car Resend non configuré)',
        },
        { status: 200 }
      )
    }

    // Envoi de l'email avec Resend
    const messageId = await sendEmail({
      from: getDefaultFromEmail(),
      to: process.env.CONTACT_EMAIL || 'contact@votre-domaine.com',
      replyTo: sanitizedEmail,
      subject: `Nouveau message de contact de ${sanitizedName}`,
      html: `
        <p>Nouveau message de contact reçu.</p>
        <p><strong>Nom :</strong> ${sanitizedName}</p>
        <p><strong>Email :</strong> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a></p>
        <p><strong>Message :</strong><br/>${sanitizedMessage}</p>
        <p><strong>Consentement RGPD :</strong> Oui</p>
        <p style="font-size: 12px; color: #666;">
          Envoyé via le formulaire de contact le ${new Date().toLocaleString(
            'fr-FR',
            {
              timeZone: 'Europe/Paris',
              dateStyle: 'full',
              timeStyle: 'long',
            }
          )}
        </p>
      `,
    })

    // E-mail de confirmation automatique à l'expéditeur (multilingue)
    // Best-effort: the request still succeeds if this secondary email fails,
    // but we explicitly await it so the runtime does not drop it after responding.
    const baseFrom = getDefaultFromEmail()
    const companyName = process.env.COMPANY_NAME?.trim()
    const emailOnly = baseFrom.match(/<([^>]+)>/)?.[1] ?? baseFrom
    const confirmationFrom = companyName
      ? `${companyName} <${emailOnly}>`
      : baseFrom
    try {
      await sendEmail({
        from: confirmationFrom,
        to: sanitizedEmail,
        subject: template.subject,
        html: `
          <p>${template.greeting} ${sanitizedName},</p>
          <p>${template.title}</p>
          <p>${template.body}</p>
          <p>${template.closing}</p>
          <p>${template.thanks}</p>
          <p>${template.signature}</p>
          <p style="font-size: 12px; color: #666;">${template.footer}</p>
      `,
      })
    } catch (err: unknown) {
      console.warn(
        '[contact] User confirmation email failed (non-blocking):',
        err
      )
    }

    return NextResponse.json(
      { message: 'Message envoyé avec succès !', id: messageId },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne.' },
      { status: 500 }
    )
  }
}
