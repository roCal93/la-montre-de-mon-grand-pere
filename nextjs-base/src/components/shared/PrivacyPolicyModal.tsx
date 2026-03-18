'use client'

import React from 'react'
import { formatLegalContent } from '@/lib/format-legal-content'

type PrivacyPolicyModalProps = {
  isOpen: boolean
  onClose: () => void
  title?: string
  content?: string
  closeButtonText?: string
}

const PrivacyPolicyModal = ({
  isOpen,
  onClose,
  title,
  content,
  closeButtonText,
}: PrivacyPolicyModalProps) => {
  if (!isOpen) return null

  const formatContent = (text: string) => formatLegalContent(text)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
    >
      <div
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2
            id="policy-modal-title"
            className="text-2xl font-bold text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-3xl leading-none focus:outline-none focus:ring-2 focus:ring-[#F88379] rounded"
            aria-label={`Fermer ${title}`}
          >
            ×
          </button>
        </div>

        <div
          className="p-6 md:p-8 prose prose-sm md:prose-base max-w-none [&_h2]:scroll-mt-20 [&_h3]:scroll-mt-20"
          dangerouslySetInnerHTML={{ __html: formatContent(content || '') }}
        />

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#F88379] text-white rounded-full hover:bg-[#e67369] transition-colors focus:outline-none focus:ring-2 focus:ring-[#F88379] focus:ring-offset-2"
          >
            {closeButtonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyModal
