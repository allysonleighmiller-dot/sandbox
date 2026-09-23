import { useState } from 'react'
import { getAutoTagEndpoint, setAutoTagEndpoint, normalizeEndpointUrl } from '../autoTag'

export default function AutoTagSettings({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState(getAutoTagEndpoint())
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    if (!value.trim()) {
      setAutoTagEndpoint('')
      onClose()
      return
    }
    const normalized = normalizeEndpointUrl(value)
    if (!normalized) {
      setError("That doesn't look like a valid URL.")
      return
    }
    setAutoTagEndpoint(normalized)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-zinc-900 p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:rounded-2xl">
        <h2 className="text-base font-semibold">Auto-tag setup</h2>
        <p className="mt-1.5 text-sm text-zinc-400">
          Auto-tagging calls a small backend you deploy yourself (it holds your Anthropic API
          key, which can't live in this app). Paste its URL below. See the{' '}
          <span className="text-zinc-300">"Auto-tag setup"</span> section of the repo's README
          for deploy steps.
        </p>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder="https://your-worker.your-subdomain.workers.dev"
          className={`mt-4 w-full rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none ${
            error ? 'border-red-500' : 'border-zinc-800 focus:border-amber-500'
          }`}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-800 py-2.5 text-sm font-medium text-zinc-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
