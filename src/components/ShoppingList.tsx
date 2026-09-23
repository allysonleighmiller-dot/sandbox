import { useMemo, useState } from 'react'
import { addShoppingItem, deleteShoppingItem, updateShoppingItem } from '../db'
import { useStore } from '../store'

export default function ShoppingList({ onOpenOutfit }: { onOpenOutfit: (id: string) => void }) {
  const { shoppingItems, outfits, refreshShoppingItems } = useStore()
  const [text, setText] = useState('')

  const outfitById = useMemo(() => new Map(outfits.map((o) => [o.id, o])), [outfits])
  const pending = shoppingItems.filter((i) => !i.bought)
  const bought = shoppingItems.filter((i) => i.bought)

  async function handleAdd() {
    const trimmed = text.trim()
    if (!trimmed) return
    await addShoppingItem({ text: trimmed })
    await refreshShoppingItems()
    setText('')
  }

  async function toggleBought(id: string, bought: boolean) {
    const item = shoppingItems.find((i) => i.id === id)
    if (!item) return
    await updateShoppingItem({ ...item, bought })
    await refreshShoppingItems()
  }

  async function remove(id: string) {
    await deleteShoppingItem(id)
    await refreshShoppingItems()
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-24 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="font-display text-3xl font-medium tracking-tight text-espresso">Shopping list</h1>
      <p className="mt-1 text-sm text-taupe">
        Items you still need to complete a look. Add one from an outfit, or jot one down here.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. black ankle boots"
          className="flex-1 rounded-md border border-oat bg-white px-3.5 py-2.5 text-sm text-espresso placeholder-taupe/60 outline-none focus:border-camel"
        />
        <button
          onClick={handleAdd}
          className="shrink-0 rounded-md bg-espresso px-4 text-sm font-medium text-ivory"
        >
          Add
        </button>
      </div>

      <div className="mt-5 space-y-2">
        {pending.length === 0 && bought.length === 0 && (
          <p className="mt-10 text-center text-sm text-taupe">Your shopping list is empty.</p>
        )}

        {pending.map((item) => {
          const outfit = item.linkedOutfitId ? outfitById.get(item.linkedOutfitId) : undefined
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-oat bg-white px-3.5 py-3"
            >
              <button
                onClick={() => toggleBought(item.id, true)}
                className="h-5 w-5 shrink-0 rounded-full border-2 border-oat"
                aria-label="Mark as bought"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-espresso">{item.text}</p>
                {outfit && (
                  <button
                    onClick={() => onOpenOutfit(outfit.id)}
                    className="text-xs text-camel underline underline-offset-2"
                  >
                    from {outfit.category || 'an outfit'}
                  </button>
                )}
              </div>
              <button onClick={() => remove(item.id)} className="shrink-0 p-1 text-taupe/70">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}

        {bought.length > 0 && (
          <div className="pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-taupe/70">Bought</p>
            <div className="space-y-2">
              {bought.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-oat/60 bg-oat/20 px-3.5 py-3 opacity-70"
                >
                  <button
                    onClick={() => toggleBought(item.id, false)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-camel text-ivory"
                    aria-label="Mark as not bought"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <p className="min-w-0 flex-1 truncate text-sm text-taupe line-through">{item.text}</p>
                  <button onClick={() => remove(item.id)} className="shrink-0 p-1 text-taupe/70">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
