type BlankBlockProps = {
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

const heightMap: Record<NonNullable<BlankBlockProps['size']>, string> = {
  small: 'h-8',
  medium: 'h-16',
  large: 'h-32',
  xlarge: 'h-64',
}

const BlankBlock = ({ size = 'medium' }: BlankBlockProps) => {
  return <div className={heightMap[size]} aria-hidden="true" />
}

export default BlankBlock
