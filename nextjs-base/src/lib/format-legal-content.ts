export function formatLegalContent(text: string): string {
  if (!text) return ''

  return text
    .replace(/^## (.+?)$/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
    .replace(
      /^### (.+?)$/gm,
      '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>'
    )
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(
      /(https?:\/\/[^\s]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-700 underline break-words">$1</a>'
    )
    .replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>')
    .replace(
      /(<li class="ml-4">.*?<\/li>\n?)+/g,
      '<ul class="list-disc list-outside mb-4 space-y-2">$&</ul>'
    )
    .replace(/\n\n+/g, '</p><p class="mb-4 leading-relaxed">')
    .replace(/^(.+)/, '<p class="mb-4 leading-relaxed">$1')
    .replace(/(.+)$/, '$1</p>')
    .replace(/<p class="[^"]*">(<h[23][^>]*>.*?<\/h[23]>)<\/p>/g, '$1')
    .replace(/<p class="[^"]*"><\/p>/g, '')
}
