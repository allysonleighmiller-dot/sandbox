import { useRef, useState } from 'react'
import { addOutfit } from '../db'
import { useStore } from '../store'

const CATEGORIES = ['Casual', 'Work', 'Date Night', 'Formal', 'Athleisure', 'Loungewear', 'Other']

export default function AddOutfit({ onSaved }: { onSaved: () => void }) {
  const { refreshOutfits } = useStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [category, setCategory] = useState(CATEGORIES[0])
  const [tagsInput, setTagsInput] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function handleFile(selected: File | null) {
    setFile(selected)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return selected ? URL.createObjectURL(selected) : null
    })
  }

  function reset() {
    handleFile(null)
    setCategory(CATEGORIES[0])
    setTagsInput('')
    setNotes('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSave() {
    if (!file) return
    setSaving(true)
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await addOutfit({ image: file, tags, category, notes: notes.trim() })
      await refreshOutfits()
      reset()
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 pb-24 pt-[calc(env(safe-area-inset-top)+16px)]">
      <h1 className="text-xl font-semibold tracking-tight">Add an outfit</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Save a screenshot of a look you like, then tag it so you can find it later.
      </p>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="mt-5 flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-900"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Selected outfit preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16.5V6a2 2 0 012-2h12a2 2 0 012 2v10.5M4 16.5l4.5-4.5a2 2 0 012.8 0l1.7 1.7a2 2 0 002.8 0L19 10M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            <span className="text-sm font-medium">Tap to choose a screenshot</span>
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
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
            Tags (comma separated)
          </label>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="denim, neutral, layered, fall"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Notes / what to shop for
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. need a cropped denim jacket and white sneakers like this"
            rows={3}
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!file || saving}
        className="mt-6 w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save outfit'}
      </button>
    </div>
  )
}
