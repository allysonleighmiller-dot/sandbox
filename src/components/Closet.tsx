import { useRef, useState } from 'react'
import { addClosetItem, updateClosetItem, deleteClosetItem, type ClosetItem } from '../db'
import { useStore } from '../store'
import { ITEM_TYPES } from '../categories'
import { suggestItemTags, suggestOutfits, AutoTagError, type OutfitSuggestion } from '../autoTag'
import OutfitImage from './OutfitImage'

interface PendingItem {
  id: string
  file: File
  previewUrl: string
  type: string
  tagsInput: string
  notes: string
  status: 'idle' | 'tagging' | 'tagged' | 'error'
  error?: string
}

function makePendingItem(file: File): PendingItem {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    type: ITEM_TYPES[0],
    tagsInput: '',
    notes: '',
    status: 'idle',
  }
}

export default function Closet() {
  const { closetItems, outfits, refreshClosetItems } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<PendingItem[]>([])
  const [saving, setSaving] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  const [detailItem, setDetailItem] = useState<ClosetItem | null>(null)

  const [suggestions, setSuggestions] = useState<OutfitSuggestion[] | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setQueue((prev) => [...prev, ...Array.from(fileList).map(makePendingItem)])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function updateQueueItem(id: string, patch: Partial<PendingItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeQueueItem(id: string) {
    setQueue((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((item) => item.id !== id)
    })
  }

  async function autoTagQueueItem(id: string) {
    const item = queue.find((i) => i.id === id)
    if (!item) return
    updateQueueItem(id, { status: 'tagging', error: undefined })
    try {
      const result = await suggestItemTags(item.file)
      updateQueueItem(id, {
        status: 'tagged',
        type: ITEM_TYPES.includes(result.type) ? result.type : item.type,
        tagsInput: result.tags.join(', '),
      })
    } catch (err) {
      updateQueueItem(id, {
        status: 'error',
        error: err instanceof AutoTagError ? err.message : 'Auto-tag failed',
      })
    }
  }

  async function handleAutoTagAll() {
    setAutoTagging(true)
    for (const item of queue) {
      if (item.status === 'tagged' || item.status === 'tagging') continue
      await autoTagQueueItem(item.id)
    }
    setAutoTagging(false)
  }

  async function handleSaveQueue() {
    if (queue.length === 0) return
    setSaving(true)
    try {
      for (const item of queue) {
        const tags = item.tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
        await addClosetItem({ image: item.file, type: item.type, tags, notes: item.notes.trim() })
      }
      await refreshClosetItems()
      queue.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setQueue([])
    } finally {
      setSaving(false)
    }
  }

  async function handleSuggest() {
    setSuggesting(true)
    setSuggestError(null)
    setSuggestions(null)
    try {
      const result = await suggestOutfits(closetItems, outfits)
      setSuggestions(result)
    } catch (err) {
      setSuggestError(err instanceof AutoTagError ? err.message : 'Could not generate suggestions.')
    } finally {
      setSuggesting(false)
    }
  }

  async function handleDetailSave(updated: ClosetItem) {
    await updateClosetItem(updated)
    await refreshClosetItems()
    setDetailItem(null)
  }

  async function handleDetailDelete(id: string) {
    await deleteClosetItem(id)
    await refreshClosetItems()
    setDetailItem(null)
  }

  const itemById = new Map(closetItems.map((item) => [item.id, item]))

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="text-xl font-semibold tracking-tight">My Closet</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Add clothes you already own, then get AI outfit ideas built from them and your saved inspiration.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-sm font-medium text-zinc-300"
        >
          + Add items
        </button>
        <button
          onClick={handleSuggest}
          disabled={closetItems.length === 0 || suggesting}
          className="flex-1 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          {suggesting ? 'Thinking...' : 'Suggest outfits'}
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />

      {queue.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">New items ({queue.length})</h2>
            <button
              onClick={handleAutoTagAll}
              disabled={autoTagging}
              className="text-xs font-medium text-amber-400 disabled:opacity-50"
            >
              {autoTagging ? 'Auto-tagging...' : 'Auto-tag all'}
            </button>
          </div>

          {queue.map((item) => (
            <div key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
              <div className="flex gap-3">
                <img src={item.previewUrl} alt="Item preview" className="h-24 w-20 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {ITEM_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => updateQueueItem(item.id, { type: t })}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          item.type === t ? 'bg-amber-400 text-zinc-950' : 'border border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    value={item.tagsInput}
                    onChange={(e) => updateQueueItem(item.id, { tagsInput: e.target.value })}
                    placeholder="tags: white, cotton, oversized"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500"
                  />
                </div>
                <button onClick={() => removeQueueItem(item.id)} className="shrink-0 self-start p-1 text-zinc-600" aria-label="Remove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <button
                  onClick={() => autoTagQueueItem(item.id)}
                  disabled={item.status === 'tagging'}
                  className="text-xs font-medium text-amber-400 disabled:opacity-50"
                >
                  {item.status === 'tagging' ? 'Tagging...' : 'Auto-tag this one'}
                </button>
                {item.status === 'tagged' && <span className="text-[11px] text-emerald-400">Tagged</span>}
              </div>
              {item.status === 'error' && <p className="mt-1.5 break-words text-[11px] text-red-400">{item.error}</p>}
            </div>
          ))}

          <button
            onClick={handleSaveQueue}
            disabled={saving}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
          >
            {saving ? 'Saving...' : `Save ${queue.length} item${queue.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {suggestError && (
        <p className="mt-4 break-words rounded-xl border border-red-900 bg-red-950/40 p-3 text-xs text-red-400">
          {suggestError}
        </p>
      )}

      {suggestions && (
        <div className="mt-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-300">Suggested outfits</h2>
          {suggestions.length === 0 && (
            <p className="text-sm text-zinc-500">No suggestions came back - try adding a few more items.</p>
          )}
          {suggestions.map((s, i) => {
            const items = s.itemIds.map((id) => itemById.get(id)).filter((x): x is ClosetItem => !!x)
            return (
              <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                <p className="text-sm font-semibold text-zinc-100">{s.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{s.reason}</p>
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {items.map((item) => (
                    <div key={item.id} className="w-16 shrink-0">
                      <OutfitImage blob={item.image} alt={item.type} className="h-20 w-16 rounded-lg object-cover" />
                      <p className="mt-1 truncate text-center text-[10px] text-zinc-500">{item.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">Your items ({closetItems.length})</h2>
        {closetItems.length === 0 && queue.length === 0 ? (
          <p className="mt-4 text-center text-sm text-zinc-500">
            No items yet. Tap "+ Add items" to start building your closet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {closetItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setDetailItem(item)}
                className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900"
              >
                <OutfitImage blob={item.image} alt={item.type} className="h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3 text-[10px] font-medium text-zinc-100">
                  {item.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {detailItem && (
        <ClosetItemDetail
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onSave={handleDetailSave}
          onDelete={handleDetailDelete}
        />
      )}
    </div>
  )
}

function ClosetItemDetail({
  item,
  onClose,
  onSave,
  onDelete,
}: {
  item: ClosetItem
  onClose: () => void
  onSave: (item: ClosetItem) => void
  onDelete: (id: string) => void
}) {
  const [type, setType] = useState(item.type)
  const [tagsInput, setTagsInput] = useState(item.tags.join(', '))
  const [notes, setNotes] = useState(item.notes)

  function handleSave() {
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
    onSave({ ...item, type, tags, notes })
  }

  function handleDelete() {
    if (!confirm('Delete this item? This cannot be undone.')) return
    onDelete(item.id)
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onClose} className="p-1 text-zinc-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={handleDelete} className="text-zinc-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="overflow-hidden rounded-2xl bg-zinc-900">
          <OutfitImage blob={item.image} alt={item.type} className="max-h-[55vh] w-full object-contain" />
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Type</label>
            <div className="flex flex-wrap gap-2">
              {ITEM_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    type === t ? 'bg-amber-400 text-zinc-950' : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Tags</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </div>
          <button onClick={handleSave} className="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950">
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
