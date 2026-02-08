import { useState } from 'react'
import { MODELS } from '@my-tanstack-app/shared'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string) => void
  model: string
  onModelChange: (model: string) => void
  disabled?: boolean
}

export default function ChatInput({
  onSend,
  model,
  onModelChange,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-3xl flex-col gap-2 rounded-xl border border-border-subtle bg-bg-input p-3"
      >
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 resize-none rounded-lg bg-transparent px-2 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex h-9 w-9 cursor-pointer items-center justify-center self-end rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="flex items-center">
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="cursor-pointer rounded-md border border-border-subtle bg-bg-surface px-2 py-1 text-xs text-text-secondary outline-none transition-colors focus:border-accent"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
        </div>
      </form>
    </div>
  )
}
