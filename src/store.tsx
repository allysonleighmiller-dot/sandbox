import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type Outfit,
  type ShoppingItem,
  type ClosetItem,
  getAllOutfits,
  getAllShoppingItems,
  getAllClosetItems,
} from './db'

interface StoreValue {
  outfits: Outfit[]
  shoppingItems: ShoppingItem[]
  closetItems: ClosetItem[]
  loading: boolean
  refreshOutfits: () => Promise<void>
  refreshShoppingItems: () => Promise<void>
  refreshClosetItems: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [closetItems, setClosetItems] = useState<ClosetItem[]>([])
  const [loading, setLoading] = useState(true)

  const refreshOutfits = useCallback(async () => {
    setOutfits(await getAllOutfits())
  }, [])

  const refreshShoppingItems = useCallback(async () => {
    setShoppingItems(await getAllShoppingItems())
  }, [])

  const refreshClosetItems = useCallback(async () => {
    setClosetItems(await getAllClosetItems())
  }, [])

  useEffect(() => {
    Promise.all([refreshOutfits(), refreshShoppingItems(), refreshClosetItems()]).finally(() =>
      setLoading(false),
    )
  }, [refreshOutfits, refreshShoppingItems, refreshClosetItems])

  return (
    <StoreContext.Provider
      value={{
        outfits,
        shoppingItems,
        closetItems,
        loading,
        refreshOutfits,
        refreshShoppingItems,
        refreshClosetItems,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
