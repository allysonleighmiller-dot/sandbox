import { useEffect, useState } from 'react'
import { deleteOutfit, updateOutfit, addShoppingItem, type Outfit } from '../db'
import { useStore } from '../store'
import { CATEGORIES } from '../categories'
import OutfitImage from './OutfitImage'

export default function OutfitDetail({
  outfit,
  onClose,
}: {
  outfit: Outfit
  onClose: () => void
}) {
  const { refreshOutfits, refreshShoppingItems } = useStore()
  const [tagsInput, setTagsInput] = useState(outfit.tags.join(', '))
  const [notes, setNotes] = useState(outfit.notes)
  const [category, setCategory] = useState(outfit.category)
  const [favorite, setFavorite] = useState(outfit.favorite)
  const [shoppingText, setShoppingText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [addedToList, setAddedToList] = useState(false)

  useEffect(() => {
    setTagsInput(outfit.tags.join(', '))
    setNotes(outfit.notes)
    setCategory(outfit.category)
    setFavorite(outfit.favorite)
    setDirty(false)
  }, [outfit])

  async function persist(next: Partial<Outfit>) {
    const updated: Outfit = {
      ...outfit,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      notes,
      category,
      favorite,
      ...next,
    }
    await updateOutfit(updated)
    await refreshOutfits()
  }

  async function handleToggleFavorite() {
    const next = !favorite
    setFavorite(next)
    await persist({ favorite: next })
  }

  async function handleSaveEdits() {
    await persist({})
    setDirty(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this outfit? This cannot be undone.')) return
    await deleteOutfit(outfit.id)
    await refreshOutfits()
    await refreshShoppingItems()
    onClose()
  }

  async function handleAddToShoppingList() {
    const text = shoppingText.trim()
    if (!text) return
    await addShoppingItem({ text, linkedOutfitId: outfit.id })
    await refreshShoppingItems()
    setShoppingText('')
    setAddedToList(true)
    setTimeout(() => setAddedToList(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button onClick={onClose} className="p-1 text-zinc-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handleToggleFavorite} className={favorite ? 'text-amber-400' : 'text-zinc-500'}>
            <svg viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.3 6.2 21l1.6-6.9L2 9.2l7-.6L12 2l3 6.6 7 .6-5.8 4.9L17.8 21z" />
            </svg>
          </button>
          <button onClick={handleDelete} className="text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="overflow-hidden rounded-2xl bg-zinc-900">
          <OutfitImage blob={outfit.image} alt={outfit.notes || 'Saved outfit'} className="max-h-[55vh] w-full object-contain" />
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c)
                    setDirty(true)
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    category === c
                      ? 'bg-amber-400 text-zinc-950'
                      : 'border border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Tags
            </label>
            <input
              value={tagsInput}
              onChange={(e) => {
                setTagsInput(e.target.value)
                setDirty(true)
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setDirty(true)
              }}
              rows={3}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </div>

          {dirty && (
            <button
              onClick={handleSaveEdits}
              className="w-full rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950"
            >
              Save changes
            </button>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Need to shop for something from this look?
            </label>
            <div className="flex gap-2">
              <input
                value={shoppingText}
                onChange={(e) => setShoppingText(e.target.value)}
                placeholder="e.g. brown leather belt"
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <button
                onClick={handleAddToShoppingList}
                className="shrink-0 rounded-xl bg-amber-400 px-4 text-sm font-semibold text-zinc-950"
              >
                {addedToList ? 'Added' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
