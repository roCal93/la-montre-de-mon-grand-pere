'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'

const CONSENT_COOKIE_NAME = 'cookie_consent'
const ONE_YEAR = 60 * 60 * 24 * 365

function setConsentCookie(value: 'accepted' | 'rejected') {
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(true)

  const isEn = useMemo(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.lang?.toLowerCase().startsWith('en')
  }, [])

  const labels = isEn
    ? {
        text: 'We use optional audience measurement cookies to improve the website. You can accept or refuse these cookies.',
        accept: 'Accept',
        reject: 'Refuse',
      }
    : {
        text: "Nous utilisons des cookies optionnels de mesure d'audience pour ameliorer le site. Vous pouvez accepter ou refuser ces cookies.",
        accept: 'Accepter',
        reject: 'Refuser',
      }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[300] px-4 pb-4">
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-300 bg-white text-gray-900 p-4 shadow-xl">
        <p className="text-sm leading-relaxed">{labels.text}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setConsentCookie('rejected')
              setVisible(false)
            }}
            className="!text-sm !leading-normal px-4 py-2"
          >
            {labels.reject}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setConsentCookie('accepted')
              setVisible(false)
            }}
            className="!text-sm !leading-normal px-5 py-2"
          >
            {labels.accept}
          </Button>
        </div>
      </div>
    </div>
  )
}
