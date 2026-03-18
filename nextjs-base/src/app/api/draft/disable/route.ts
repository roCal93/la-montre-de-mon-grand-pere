import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || '/'

  // Disable Draft Mode
  const dm = await draftMode()
  dm.disable()

  // Redirect back to the page
  redirect(returnUrl)
}
