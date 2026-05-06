/**
 * Custom Next.js image loader for Cloudinary.
 *
 * Instead of routing Cloudinary images through Next.js's own optimization
 * pipeline (/_next/image), this loader injects Cloudinary transformation
 * parameters directly into the URL.  This eliminates double-compression and
 * lets Cloudinary handle resizing / quality / format natively.
 *
 * Cloudinary URL pattern written by Strapi:
 *   https://res.cloudinary.com/{cloud}/image/upload[/v{ts}]/{folder}/{file}.ext
 *
 * We inject `w_{width},q_{quality},f_auto` right after `/upload/`.
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}): string {
  const q = quality ?? 90

  if (src.includes('res.cloudinary.com')) {
    // Avoid double-injecting if transformations are already present
    const hasTransform = /\/upload\/[a-z_,0-9]+\//.test(src)
    if (hasTransform) return src

    return src.replace('/upload/', `/upload/w_${width},q_${q},f_auto/`)
  }

  // Fallback for non-Cloudinary sources (local dev, etc.)
  return src
}
