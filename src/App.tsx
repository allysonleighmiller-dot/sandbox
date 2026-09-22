import { useState } from 'react'
import { StoreProvider, useStore } from './store'
import BottomNav, { type Tab } from './components/BottomNav'
import Gallery from './components/Gallery'
import AddOutfit from './components/AddOutfit'
import ShoppingList from './components/ShoppingList'
import OutfitDetail from './components/OutfitDetail'

function Screens() {
  const { outfits } = useStore()
  const [tab, setTab] = useState<Tab>('gallery')
  const [openOutfitId, setOpenOutfitId] = useState<string | null>(null)

  const openOutfit = outfits.find((o) => o.id === openOutfitId) ?? null

  return (
    <div className="h-dvh bg-zinc-950 text-zinc-100">
      <div className="h-full pb-16">
        {tab === 'gallery' && <Gallery onOpen={setOpenOutfitId} />}
        {tab === 'add' && <AddOutfit onSaved={() => setTab('gallery')} />}
        {tab === 'shopping' && <ShoppingList onOpenOutfit={setOpenOutfitId} />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
      {openOutfit && <OutfitDetail outfit={openOutfit} onClose={() => setOpenOutfitId(null)} />}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Screens />
    </StoreProvider>
  )
}
