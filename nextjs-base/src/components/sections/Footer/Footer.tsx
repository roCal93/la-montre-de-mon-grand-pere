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
  const privacyLabel = isEn ? 'Privacy Policy' : 'Politique de confidentialité'
  const legalLabel = isEn ? 'Legal Notice' : 'Mentions légales'
  const shippingLabel = isEn ? 'Shipping' : 'Livraison'
  const warrantyLabel = isEn ? 'Warranty' : 'Garantie'
  const rightsLabel = isEn ? 'All rights reserved.' : 'Tous droits réservés.'
  const madeWithLabel = isEn ? 'Made with passion by' : 'Fait avec passion par'

  return (
    <footer className="relative z-10 -mt-12 backdrop-blur-sm bg-white/10 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-8 text-center">
      <div className="space-y-3">
        <p className="text-sm">
          {siteName} © {currentYear}. {rightsLabel}
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <Link
            href={`/${locale}/privacy-policy`}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
          >
            {privacyLabel}
          </Link>
          <span aria-hidden="true" className="text-gray-400 dark:text-gray-600">
            •
          </span>
          <Link
            href={`/${locale}/legal-notice`}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
          >
            {legalLabel}
          </Link>
          <span aria-hidden="true" className="text-gray-400 dark:text-gray-600">
            •
          </span>
          <Link
            href={`/${locale}/livraison`}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
          >
            {shippingLabel}
          </Link>
          <span aria-hidden="true" className="text-gray-400 dark:text-gray-600">
            •
          </span>
          <Link
            href={`/${locale}/garantie`}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
          >
            {warrantyLabel}
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {madeWithLabel}{' '}
          <a
            href="https://hakunamataweb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:underline"
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
            style={{
              transform: 'rotate(21deg)',
              width: '30px',
              height: '25px',
            }}
            className="opacity-40 dark:brightness-0 dark:invert dark:opacity-30"
          />
        </div>
      </div>
    </footer>
  )
}
