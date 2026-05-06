/**
 * Custom Next.js image loader for Cloudinary.
 *
 * Instead of routing Cloudinary images through Next.js's own optimization
 * pipeline (/_next/image), this loader injects Cloudinary transformation
 * parameters directly into the URL.  This eliminates double-compression and
 * lets Cloudinary handle resizing / quality / format natively.
 *
 * Cloudinary URL pattern written by Strapi:
 *   https://res.cloudinary.com/{cloud}/image/upload[/v{timestamp}]/{public_id}
 *
 * Transforms must be placed BEFORE the optional version segment:
 *   .../upload/w_800,q_90,f_auto/v1234567890/folder/file.jpg
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
    // Skip if Cloudinary transforms are already present.
    // Real transforms always contain an underscore (w_x, q_y, f_auto, c_fill …).
    // Version segments (/v1234567890/) do NOT contain underscores.
    const hasTransform = /\/upload\/[^/]*_[^/]*\//.test(src)
    if (hasTransform) return src

    // Inject transforms, preserving the optional version segment after /upload/
    return src.replace(
      /\/upload\/(v\d+\/)?/,
      (_, version) => `/upload/w_${width},q_${q},f_auto/${version ?? ''}`
    )
  }

  // Fallback for non-Cloudinary sources (local dev, etc.)
  return src
}
