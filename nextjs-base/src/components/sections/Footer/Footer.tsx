import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

type FooterProps = {
  siteName?: string
  locale?: string
}

export const Footer = ({
  siteName = 'Hakuna Mataweb',
  locale = 'fr',
}: FooterProps) => {
  const currentYear = new Date().getFullYear()
  const isEn = locale === 'en'
  const privacyLabel = isEn ? 'Privacy Policy' : 'Politique de confidentialite'
  const legalLabel = isEn ? 'Legal Notice' : 'Mentions legales'
  const rightsLabel = isEn ? 'All rights reserved.' : 'Tous droits reserves.'
  const madeWithLabel = isEn ? 'Made with passion by' : 'Fait avec passion par'

  return (
    <footer className="backdrop-blur-sm bg-white/10 border-t border-gray-200 text-gray-700 py-8 text-center">
      <div className="space-y-3">
        <p className="text-sm">
          {siteName} © {currentYear}. {rightsLabel}
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href={`/${locale}/privacy-policy`}
            className="text-gray-500 hover:text-gray-900 hover:underline"
          >
            {privacyLabel}
          </Link>
          <span aria-hidden="true" className="text-gray-400">
            •
          </span>
          <Link
            href={`/${locale}/legal-notice`}
            className="text-gray-500 hover:text-gray-900 hover:underline"
          >
            {legalLabel}
          </Link>
        </div>
        <p className="text-sm text-gray-500">
          {madeWithLabel}{' '}
          <a
            href="https://hakuna-mataweb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900 hover:underline"
          >
            Hakuna Mataweb
          </a>
        </p>
        <div className="flex justify-center mt-4">
          <Image
            src="/images/hakuna-mataweb-logo.svg"
            alt="Logo Hakuna Mataweb"
            width={30}
            height={25}
            style={{ transform: 'rotate(21deg)' }}
            className="opacity-80 hover:opacity-100 transition-opacity"
          />
        </div>
      </div>
    </footer>
  )
}
