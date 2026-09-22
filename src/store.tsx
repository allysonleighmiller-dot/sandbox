import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type Outfit,
  type ShoppingItem,
  getAllOutfits,
  getAllShoppingItems,
} from './db'

interface StoreValue {
  outfits: Outfit[]
  shoppingItems: ShoppingItem[]
  loading: boolean
  refreshOutfits: () => Promise<void>
  refreshShoppingItems: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [outfits, setOutfits] = useState<Outfit[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)

  const refreshOutfits = useCallback(async () => {
    setOutfits(await getAllOutfits())
  }, [])

  const refreshShoppingItems = useCallback(async () => {
    setShoppingItems(await getAllShoppingItems())
  }, [])

  useEffect(() => {
    Promise.all([refreshOutfits(), refreshShoppingItems()]).finally(() => setLoading(false))
  }, [refreshOutfits, refreshShoppingItems])

  return (
    <StoreContext.Provider
      value={{ outfits, shoppingItems, loading, refreshOutfits, refreshShoppingItems }}
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
