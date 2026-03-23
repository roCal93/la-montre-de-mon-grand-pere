type BlankBlockProps = {
  size?: 'small' | 'medium' | 'large' | 'xlarge'
}

const heightMap: Record<NonNullable<BlankBlockProps['size']>, string> = {
  small: 'h-16',
  medium: 'h-32',
  large: 'h-64',
  xlarge: 'h-96',
}

const BlankBlock = ({ size = 'medium' }: BlankBlockProps) => {
  return <div className={heightMap[size]} aria-hidden="true" />
}

export default BlankBlock
