export type Tab = 'gallery' | 'add' | 'shopping'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'gallery', label: 'Outfits', icon: 'M4 5h16M4 12h16M4 19h16' },
  { id: 'add', label: 'Add', icon: 'M12 4v16m-8-8h16' },
  { id: 'shopping', label: 'Shopping', icon: 'M6 6h15l-1.5 9h-12z M6 6L4 3H2 M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z' },
]

export default function BottomNav({
  active,
  onChange,
}: {
  active: Tab
  onChange: (tab: Tab) => void
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
              isActive ? 'text-amber-400' : 'text-zinc-500'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
