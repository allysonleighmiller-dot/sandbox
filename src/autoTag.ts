const ENDPOINT_KEY = 'outfitbook.autoTagEndpoint'
const MAX_DIMENSION = 1024

export function getAutoTagEndpoint(): string {
  try {
    return localStorage.getItem(ENDPOINT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setAutoTagEndpoint(url: string): void {
  try {
    localStorage.setItem(ENDPOINT_KEY, url.trim())
  } catch {
    // ignore - private browsing / storage blocked
  }
}

async function downscaleForUpload(blob: Blob): Promise<{ dataUrl: string; mediaType: string }> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  return { dataUrl, mediaType: 'image/jpeg' }
}

export interface TagSuggestion {
  category: string
  tags: string[]
}

export class AutoTagError extends Error {}

export async function suggestTagsForImage(blob: Blob): Promise<TagSuggestion> {
  const endpoint = getAutoTagEndpoint()
  if (!endpoint) {
    throw new AutoTagError('No auto-tag endpoint configured yet.')
  }

  const { dataUrl, mediaType } = await downscaleForUpload(blob)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mediaType }),
    })
  } catch {
    throw new AutoTagError('Could not reach the auto-tag service. Check the endpoint URL and your connection.')
  }

  if (!response.ok) {
    let message = `Auto-tag request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // ignore parse failure, use default message
    }
    throw new AutoTagError(message)
  }

  const data = await response.json()
  if (!data?.category || !Array.isArray(data?.tags)) {
    throw new AutoTagError('Auto-tag service returned an unexpected response.')
  }
  return { category: data.category, tags: data.tags }
}
