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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-espresso/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-lg border border-oat bg-ivory p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:rounded-lg">
        <h2 className="font-display text-xl text-espresso">Auto-tag setup</h2>
        <p className="mt-1.5 text-sm text-taupe">
          Auto-tagging calls a small backend you deploy yourself (it holds your Anthropic API
          key, which can't live in this app). Paste its URL below. See the{' '}
          <span className="text-espresso">"Auto-tag setup"</span> section of the repo's README
          for deploy steps.
        </p>
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder="https://your-worker.your-subdomain.workers.dev"
          className={`mt-4 w-full rounded-md border bg-white px-3.5 py-2.5 text-sm text-espresso placeholder-taupe/60 outline-none ${
            error ? 'border-rust' : 'border-oat focus:border-camel'
          }`}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {error && <p className="mt-1.5 text-xs text-rust">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-oat py-2.5 text-sm font-medium text-espresso"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-md bg-espresso py-2.5 text-sm font-medium text-ivory"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
