import Image from 'next/image'
import { StrapiMedia } from '@/types/strapi'
import { cleanImageUrl } from '@/lib/strapi'

type ImageBlockProps = {
  image: StrapiMedia
  caption?: string
  alignment: 'left' | 'center' | 'right' | 'full'
  size: 'small' | 'medium' | 'large' | 'full'
  priority?: boolean
}

const ImageBlock = ({ image, caption, alignment, size, priority }: ImageBlockProps) => {
  const imageSrc = cleanImageUrl(image.url)
  const finalImageSrc = imageSrc && imageSrc.startsWith('/') 
    ? `${process.env.NEXT_PUBLIC_STRAPI_URL}${imageSrc}` 
    : imageSrc || ''

  const alignmentClasses = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
    full: 'w-full',
  }

  const sizeClasses = {
    small: 'max-w-sm',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'w-full',
  }

  return (
    <figure className={`my-6 ${alignmentClasses[alignment]} ${sizeClasses[size]}`}>
      <Image
        src={finalImageSrc}
        alt={image.alternativeText || caption || 'Image'}
        width={image.width || 800}
        height={image.height || 600}
        className="w-full h-auto object-cover rounded-lg"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
        quality={85}
        priority={priority}
        fetchPriority={priority ? 'high' : undefined}
      />
      {caption && (
        <figcaption className="text-sm text-gray-600 mt-2 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

export default ImageBlock
