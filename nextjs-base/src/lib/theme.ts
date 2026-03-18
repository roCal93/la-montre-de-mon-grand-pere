export function isDisableDark(): boolean {
  const val = process.env.NEXT_PUBLIC_DISABLE_DARK
  return val === '1' || val === 'true' || val === 'yes'
}
