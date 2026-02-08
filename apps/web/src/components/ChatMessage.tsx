import { getModelName } from '@my-tanstack-app/shared'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  model?: string
  isStreaming: boolean
}

export default function ChatMessage({
  role,
  content,
  model,
  isStreaming,
}: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 px-4 py-4 ${isUser ? '' : 'bg-gray-50'}`}>
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
          isUser ? 'bg-indigo-500' : 'bg-emerald-500'
        }`}
      >
        {isUser ? 'U' : 'A'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">
            {isUser ? 'You' : 'Assistant'}
          </span>
          {model && !isUser && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500">
              {getModelName(model)}
            </span>
          )}
          {isStreaming && (
            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-500">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
              streaming
            </span>
          )}
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
          {content || (isStreaming ? '' : '(empty response)')}
        </div>
      </div>
    </div>
  )
}
