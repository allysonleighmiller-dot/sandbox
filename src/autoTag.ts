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

/**
 * Normalizes a user-typed endpoint into an absolute http(s) URL, adding a
 * "https://" scheme if one is missing. Without this, a scheme-less value
 * (e.g. pasted without "https://") resolves as a path relative to the app's
 * own origin instead of throwing - silently POSTing to the wrong server.
 */
export function normalizeEndpointUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
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
  const rawEndpoint = getAutoTagEndpoint()
  if (!rawEndpoint) {
    throw new AutoTagError('No auto-tag endpoint configured yet.')
  }
  const endpoint = normalizeEndpointUrl(rawEndpoint)
  if (!endpoint) {
    throw new AutoTagError('The saved auto-tag endpoint is not a valid URL. Open Settings and re-enter it.')
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
    const rawText = await response.text().catch(() => '')
    let message = `Auto-tag request failed (${response.status})`
    try {
      const body = JSON.parse(rawText)
      if (body?.error) message = body.error
    } catch {
      // Not JSON - the response likely didn't come from our worker at all
      // (e.g. an edge/proxy block page). Surface it so it's diagnosable
      // without dev tools.
      if (rawText.trim()) {
        message = `${message}: ${rawText.trim().slice(0, 200)}`
      }
    }
    throw new AutoTagError(message)
  }

  const data = await response.json()
  if (!data?.category || !Array.isArray(data?.tags)) {
    throw new AutoTagError('Auto-tag service returned an unexpected response.')
  }
  return { category: data.category, tags: data.tags }
}
