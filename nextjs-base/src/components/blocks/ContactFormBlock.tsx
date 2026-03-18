'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import PrivacyPolicyModal from '@/components/shared/PrivacyPolicyModal'
import { StrapiEntity, PrivacyPolicy } from '@/types/strapi'
import Cookies from 'js-cookie'

type ContactFormBlockProps = {
  title?: string
  description?: string
  submitButtonText?: string
  namePlaceholder?: string
  emailPlaceholder?: string
  messagePlaceholder?: string
  nameLabel?: string
  emailLabel?: string
  messageLabel?: string
  consentText?: string
  policyLinkText?: string
  successMessage?: string
  errorMessage?: string
  submittingText?: string
  rgpdInfoText?: string
  consentRequiredText?: string
  blockAlignment?: 'left' | 'center' | 'right' | 'full'
  maxWidth?: 'small' | 'medium' | 'large' | 'full'
  // Relation vers Privacy Policy
  privacyPolicy?: PrivacyPolicy & StrapiEntity
}

const ContactFormBlock = ({
  title,
  description,
  submitButtonText,
  namePlaceholder,
  emailPlaceholder,
  messagePlaceholder,
  nameLabel,
  emailLabel,
  messageLabel,
  consentText,
  policyLinkText,
  successMessage,
  errorMessage,
  submittingText,
  rgpdInfoText,
  consentRequiredText,
  blockAlignment = 'center',
  maxWidth = 'medium',
  privacyPolicy,
}: ContactFormBlockProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    consent: false,
    // Honeypot - champ invisible pour piéger les bots
    website: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle')
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)

  const blockAlignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
    full: 'w-full',
  }

  const maxWidthClasses = {
    small: 'max-w-2xl',
    medium: 'max-w-4xl',
    large: 'max-w-6xl',
    full: 'max-w-none',
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Récupérer la locale depuis le cookie
      const locale = Cookies.get('locale') || 'fr'

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, locale }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi")
      }

      console.log('Form submitted successfully:', data)
      setSubmitStatus('success')
      setFormData({
        name: '',
        email: '',
        message: '',
        consent: false,
        website: '',
      })
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className={`w-full ${blockAlignmentClasses[blockAlignment]} ${maxWidthClasses[maxWidth]} py-10 px-4`}
    >
      <div className="w-full rounded-lg border border-neutral-200 bg-white/80 p-8 shadow-sm">
        {title && (
          <h2 className="text-2xl font-semibold text-neutral-900 mb-3">
            {title}
          </h2>
        )}

        {description && (
          <p className="text-neutral-700 mb-8 whitespace-pre-line">{description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium text-neutral-800">
                {nameLabel} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900/60"
                placeholder={namePlaceholder}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-neutral-800">
                {emailLabel} *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900/60"
                placeholder={emailPlaceholder}
              />
            </div>
          </div>

          {/* Honeypot - Champ invisible pour les bots */}
          <input
            type="text"
            name="website"
            value={formData.website}
            onChange={handleChange}
            autoComplete="off"
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '-9999px',
              width: '1px',
              height: '1px',
            }}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-sm font-medium text-neutral-800">
              {messageLabel} *
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900/60 resize-vertical"
              placeholder={messagePlaceholder}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consent"
                name="consent"
                checked={formData.consent}
                onChange={handleChange}
                required
                className="mt-1 h-4 w-4 rounded border border-neutral-300 text-neutral-900 focus:ring-neutral-900/60"
              />
              <label htmlFor="consent" className="text-sm text-neutral-800">
                {consentText}{' '}
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(true)}
                  className="underline underline-offset-2 transition-colors hover:text-neutral-700"
                >
                  {policyLinkText}
                </button>
                . *
              </label>
            </div>

            {rgpdInfoText && (
              <div className="whitespace-pre-line rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-700">
                {rgpdInfoText}
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !formData.consent}
            >
              {isSubmitting ? submittingText : submitButtonText}
            </Button>
            {!formData.consent && consentRequiredText && (
              <p className="text-xs text-neutral-600">{consentRequiredText}</p>
            )}
          </div>

          {submitStatus === 'success' && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}
        </form>
      </div>

      <PrivacyPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title={privacyPolicy?.title}
        content={privacyPolicy?.content}
        closeButtonText={privacyPolicy?.closeButtonText}
      />
    </div>
  )
}

export default ContactFormBlock
