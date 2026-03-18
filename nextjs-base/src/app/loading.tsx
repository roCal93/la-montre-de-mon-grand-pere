export default function Loading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
    </div>
  )
}