import { useMemo, useState } from 'react'
import { useStore } from '../store'
import OutfitImage from './OutfitImage'

export default function Gallery({ onOpen }: { onOpen: (id: string) => void }) {
  const { outfits, loading } = useStore()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('All')

  const categories = useMemo(() => {
    const set = new Set(outfits.map((o) => o.category).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [outfits])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return outfits.filter((o) => {
      if (category !== 'All' && o.category !== category) return false
      if (!q) return true
      const haystack = [o.notes, o.category, ...o.tags].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [outfits, search, category])

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-10 space-y-3 bg-ivory/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur">
        <h1 className="font-display text-3xl font-medium tracking-tight text-espresso">Outfit Book</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags, notes, category..."
          className="w-full rounded-md border border-oat bg-white px-3.5 py-2.5 text-sm text-espresso placeholder-taupe/60 outline-none focus:border-camel"
        />
        {categories.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                  category === c
                    ? 'bg-espresso text-ivory'
                    : 'border border-oat bg-white text-taupe'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="mt-10 text-center text-sm text-taupe">Loading your closet...</p>
        ) : filtered.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <p className="font-display text-xl text-espresso">
              {outfits.length === 0 ? 'No outfits saved yet' : 'No outfits match that search'}
            </p>
            <p className="max-w-xs text-sm text-taupe">
              {outfits.length === 0
                ? 'Tap the Add tab to save your first outfit screenshot.'
                : 'Try a different search or category.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-3">
            {filtered.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => onOpen(outfit.id)}
                className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-oat bg-oat text-left"
              >
                <OutfitImage
                  blob={outfit.image}
                  alt={outfit.notes || outfit.category || 'Saved outfit'}
                  className="h-full w-full object-cover transition-transform group-active:scale-95"
                />
                {outfit.favorite && (
                  <span className="absolute right-2 top-2 rounded-full bg-espresso/70 p-1.5 text-camel">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M12 17.3 6.2 21l1.6-6.9L2 9.2l7-.6L12 2l3 6.6 7 .6-5.8 4.9L17.8 21z" />
                    </svg>
                  </span>
                )}
                {outfit.category && (
                  <span className="absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-espresso/85 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-medium tracking-wide text-ivory">
                    {outfit.category}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
