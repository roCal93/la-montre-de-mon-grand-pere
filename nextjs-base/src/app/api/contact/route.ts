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
    title: 'Merci pour votre message !',
    greeting: 'Bonjour',
    body: 'Nous avons bien reçu votre message et nous vous en remercions.',
    closing: 'Notre équipe vous répondra dans les plus brefs délais.',
    signature: "L'équipe",
    footer: 'Cet email est envoyé automatiquement, merci de ne pas y répondre.',
  },
  en: {
    subject: 'Confirmation of receipt of your message',
    title: 'Thank you for your message!',
    greeting: 'Hello',
    body: 'We have received your message and thank you for it.',
    closing: 'Our team will respond to you as soon as possible.',
    signature: 'The team',
    footer: 'This email is sent automatically, please do not reply.',
  },
  it: {
    subject: 'Conferma di ricezione del tuo messaggio',
    title: 'Grazie per il tuo messaggio!',
    greeting: 'Ciao',
    body: 'Abbiamo ricevuto il tuo messaggio e ti ringraziamo.',
    closing: 'Il nostro team ti risponderà il prima possibile.',
    signature: 'Il team',
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

    // Vérifier si Amazon SES est configuré
    if (!isEmailConfigured()) {
      console.warn('AWS SES not configured. Email not sent.')
      return NextResponse.json(
        {
          success: true,
          message:
            'Message reçu (mode démo - email non envoyé car Amazon SES non configuré)',
        },
        { status: 200 }
      )
    }

    // Envoi de l'email avec Amazon SES
    const messageId = await sendEmail({
      from: getDefaultFromEmail(),
      to: process.env.CONTACT_EMAIL || 'contact@votre-domaine.com',
      replyTo: sanitizedEmail,
      subject: `Nouveau message de contact de ${sanitizedName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #3b82f6;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 20px;
                border: 1px solid #ddd;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .info-row {
                margin-bottom: 15px;
                padding-bottom: 15px;
                border-bottom: 1px solid #ddd;
              }
              .label {
                font-weight: bold;
                color: #555;
              }
              .message-box {
                background-color: white;
                padding: 15px;
                border-radius: 5px;
                margin-top: 10px;
                white-space: pre-wrap;
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">Nouveau message de contact</h1>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">Nom :</span> ${sanitizedName}
              </div>
              <div class="info-row">
                <span class="label">Email :</span> <a href="mailto:${sanitizedEmail}">${sanitizedEmail}</a>
              </div>
              <div class="info-row">
                <span class="label">Message :</span>
                <div class="message-box">${sanitizedMessage}</div>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <span class="label">Consentement RGPD :</span> ✓ Accordé
              </div>
            </div>
            <div class="footer">
              <p>Ce message a été envoyé via le formulaire de contact de votre site web.</p>
              <p>Date : ${new Date().toLocaleString('fr-FR', {
                timeZone: 'Europe/Paris',
                dateStyle: 'full',
                timeStyle: 'long',
              })}</p>
            </div>
          </body>
        </html>
      `,
    })

    // Email de confirmation automatique à l'expéditeur (multilingue)
    await sendEmail({
      from: `${process.env.COMPANY_NAME || 'Contact'} <${getDefaultFromEmail()}>`,
      to: sanitizedEmail,
      subject: template.subject,
      html: `
        <!DOCTYPE html>
        <html lang="${validLocale}">
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #3b82f6;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border: 1px solid #ddd;
                border-top: none;
                border-radius: 0 0 8px 8px;
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">${template.title}</h1>
            </div>
            <div class="content">
              <p>${template.greeting} ${sanitizedName},</p>
              <p>${template.body}</p>
              <p>${template.closing}</p>
              <p>Cordialement,<br>${template.signature}</p>
            </div>
            <div class="footer">
              <p>${template.footer}</p>
            </div>
          </body>
        </html>
      `,
    })

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
