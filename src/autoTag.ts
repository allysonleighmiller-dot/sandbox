import type { ClosetItem, Outfit } from './db'

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

export class AutoTagError extends Error {}

async function postToWorker(body: Record<string, unknown>): Promise<unknown> {
  const rawEndpoint = getAutoTagEndpoint()
  if (!rawEndpoint) {
    throw new AutoTagError('No auto-tag endpoint configured yet.')
  }
  const endpoint = normalizeEndpointUrl(rawEndpoint)
  if (!endpoint) {
    throw new AutoTagError('The saved auto-tag endpoint is not a valid URL. Open Settings and re-enter it.')
  }

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AutoTagError('Could not reach the auto-tag service. Check the endpoint URL and your connection.')
  }

  if (!response.ok) {
    const rawText = await response.text().catch(() => '')
    let message = `Auto-tag request failed (${response.status})`
    try {
      const parsed = JSON.parse(rawText)
      if (parsed?.error) message = parsed.error
      if (parsed?.detail) message = `${message}: ${String(parsed.detail).slice(0, 300)}`
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

  return response.json()
}

export interface TagSuggestion {
  category: string
  tags: string[]
}

export async function suggestTagsForImage(blob: Blob): Promise<TagSuggestion> {
  const { dataUrl, mediaType } = await downscaleForUpload(blob)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const data = (await postToWorker({ mode: 'tag_outfit', image: base64, mediaType })) as Partial<TagSuggestion>
  if (!data?.category || !Array.isArray(data?.tags)) {
    throw new AutoTagError('Auto-tag service returned an unexpected response.')
  }
  return { category: data.category, tags: data.tags }
}

export interface ItemTagSuggestion {
  type: string
  tags: string[]
}

export async function suggestItemTags(blob: Blob): Promise<ItemTagSuggestion> {
  const { dataUrl, mediaType } = await downscaleForUpload(blob)
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const data = (await postToWorker({ mode: 'tag_item', image: base64, mediaType })) as Partial<ItemTagSuggestion>
  if (!data?.type || !Array.isArray(data?.tags)) {
    throw new AutoTagError('Auto-tag service returned an unexpected response.')
  }
  return { type: data.type, tags: data.tags }
}

export interface OutfitSuggestion {
  title: string
  itemIds: string[]
  reason: string
}

export async function suggestOutfits(
  closetItems: ClosetItem[],
  inspiration: Outfit[],
): Promise<OutfitSuggestion[]> {
  const data = (await postToWorker({
    mode: 'suggest_outfits',
    closetItems: closetItems.map((item) => ({
      id: item.id,
      type: item.type,
      tags: item.tags,
      notes: item.notes,
    })),
    inspiration: inspiration.map((outfit) => ({
      category: outfit.category,
      tags: outfit.tags,
      notes: outfit.notes,
    })),
  })) as { outfits?: Array<{ title: string; item_ids: string[]; reason: string }> }

  if (!Array.isArray(data?.outfits)) {
    throw new AutoTagError('Auto-tag service returned an unexpected response.')
  }
  return data.outfits.map((o) => ({ title: o.title, itemIds: o.item_ids, reason: o.reason }))
}
