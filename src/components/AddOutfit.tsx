import { useRef, useState } from 'react'
import { addOutfit } from '../db'
import { useStore } from '../store'
import { CATEGORIES } from '../categories'
import { getAutoTagEndpoint, suggestTagsForImage, AutoTagError } from '../autoTag'
import AutoTagSettings from './AutoTagSettings'

interface PendingItem {
  id: string
  file: File
  previewUrl: string
  category: string
  tagsInput: string
  notes: string
  status: 'idle' | 'tagging' | 'tagged' | 'error'
  error?: string
}

function makeItem(file: File): PendingItem {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    category: CATEGORIES[0],
    tagsInput: '',
    notes: '',
    status: 'idle',
  }
}

export default function AddOutfit({ onSaved }: { onSaved: () => void }) {
  const { refreshOutfits } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PendingItem[]>([])
  const [saving, setSaving] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const newItems = Array.from(fileList).map(makeItem)
    setItems((prev) => [...prev, ...newItems])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function updateItem(id: string, patch: Partial<PendingItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeItem(id: string) {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  async function autoTagItem(id: string) {
    const item = items.find((i) => i.id === id)
    if (!item) return
    updateItem(id, { status: 'tagging', error: undefined })
    try {
      const result = await suggestTagsForImage(item.file)
      updateItem(id, {
        status: 'tagged',
        category: CATEGORIES.includes(result.category) ? result.category : item.category,
        tagsInput: result.tags.join(', '),
      })
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err instanceof AutoTagError ? err.message : 'Auto-tag failed',
      })
    }
  }

  async function handleAutoTagAll() {
    if (!getAutoTagEndpoint()) {
      setSettingsOpen(true)
      return
    }
    setAutoTagging(true)
    for (const item of items) {
      if (item.status === 'tagged' || item.status === 'tagging') continue
      await autoTagItem(item.id)
    }
    setAutoTagging(false)
  }

  function resetAll() {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    setItems([])
  }

  async function handleSaveAll() {
    if (items.length === 0) return
    setSaving(true)
    try {
      for (const item of items) {
        const tags = item.tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
        await addOutfit({ image: item.file, tags, category: item.category, notes: item.notes.trim() })
      }
      await refreshOutfits()
      resetAll()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Add outfits</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Select one or many screenshots, then auto-tag or edit before saving.
          </p>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="mt-0.5 shrink-0 rounded-full border border-zinc-800 p-2 text-zinc-400"
          aria-label="Auto-tag settings"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-[18px] w-[18px]">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.09A1.65 1.65 0 009 4.6V4.5a2 2 0 114 0V4.6a1.65 1.65 0 001 1.51h.09a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.09c.26.63.85 1.05 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>

      {items.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-5 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900"
        >
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.5V6a2 2 0 012-2h12a2 2 0 012 2v10.5M4 16.5l4.5-4.5a2 2 0 012.8 0l1.7 1.7a2 2 0 002.8 0L19 10M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <span className="text-sm font-medium">Tap to choose screenshots</span>
            <span className="text-xs text-zinc-600">You can select more than one</span>
          </div>
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-medium text-zinc-300"
            >
              Add more
            </button>
            <button
              onClick={handleAutoTagAll}
              disabled={autoTagging}
              className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-sm font-medium text-amber-400 disabled:opacity-50"
            >
              {autoTagging ? 'Auto-tagging...' : `Auto-tag all (${items.length})`}
            </button>
          </div>

          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex gap-3">
                <img
                  src={item.previewUrl}
                  alt="Outfit preview"
                  className="h-24 w-20 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateItem(item.id, { category: c })}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          item.category === c
                            ? 'bg-amber-400 text-zinc-950'
                            : 'border border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <input
                    value={item.tagsInput}
                    onChange={(e) => updateItem(item.id, { tagsInput: e.target.value })}
                    placeholder="tags: denim, neutral, fall"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500"
                  />
                  <input
                    value={item.notes}
                    onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                    placeholder="notes (optional)"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="shrink-0 self-start p-1 text-zinc-600"
                  aria-label="Remove"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => autoTagItem(item.id)}
                  disabled={item.status === 'tagging'}
                  className="text-xs font-medium text-amber-400 disabled:opacity-50"
                >
                  {item.status === 'tagging' ? 'Tagging...' : 'Auto-tag this one'}
                </button>
                {item.status === 'tagged' && (
                  <span className="text-[11px] text-emerald-400">Tagged</span>
                )}
                {item.status === 'error' && (
                  <span className="text-[11px] text-red-400">{item.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {items.length > 0 && (
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          {saving ? 'Saving...' : `Save ${items.length} outfit${items.length > 1 ? 's' : ''}`}
        </button>
      )}

      {settingsOpen && <AutoTagSettings onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
