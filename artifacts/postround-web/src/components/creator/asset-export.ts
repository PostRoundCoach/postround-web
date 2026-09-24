export function safeFilePart(value: string | null) {
  return (value || 'round').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'round'
}

export async function downloadSvgPng(svg: string, width: number, height: number, filename: string) {
  const sourceUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = sourceUrl
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image rendering is unavailable')
    context.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Image generation failed')
    const link = document.createElement('a')
    const downloadUrl = URL.createObjectURL(blob)
    try {
      link.href = downloadUrl
      link.download = filename
      link.click()
    } finally {
      // Let the browser consume the link before releasing its URL.
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
    }
  } finally {
    URL.revokeObjectURL(sourceUrl)
  }
}