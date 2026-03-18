import React from 'react'
import Link from 'next/link'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'

type BaseButtonProps = {
  variant?: ButtonVariant
  children: React.ReactNode
  className?: string
}

type ButtonAsButton = BaseButtonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: never
  }

type ButtonAsLink = BaseButtonProps & {
  href: string
  target?: string
  rel?: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

const getVariantStyles = (variant: ButtonVariant): string => {
  const styles = {
    primary:
      "bg-[rgba(217,217,217,0.2)] backdrop-blur-md rounded-[10px] text-center text-black font-['Afacad'] font-normal text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-1px_0_rgba(255,255,255,0.2),0_10px_30px_rgba(0,0,0,0.12)] hover:bg-[rgba(217,217,217,0.28)] active:bg-[rgba(217,217,217,0.35)]",
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
    ghost: 'text-blue-600 hover:bg-blue-50',
  }
  return styles[variant]
}

export const Button = ({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) => {
  const base =
    'px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center text-center gap-2'
  const variantStyles = getVariantStyles(variant)
  const classes = `${base} ${variantStyles} ${className}`

  if ('href' in props && props.href) {
    const { href, target, rel, ...linkProps } = props
    const isExternal = target === '_blank' || href.startsWith('http')

    return (
      <Link
        href={href}
        target={target}
        rel={rel || (isExternal ? 'noopener noreferrer' : undefined)}
        className={classes}
        {...linkProps}
      >
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
