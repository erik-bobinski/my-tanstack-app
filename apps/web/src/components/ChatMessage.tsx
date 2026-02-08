import { getModelName } from '@my-tanstack-app/shared'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark-dimmed.css'

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
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'bg-bg-user-bubble text-text-primary'
              : 'bg-bg-ai-bubble text-text-primary'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">
              {content || '(empty message)'}
            </div>
          ) : (
            <div className="markdown-content">
              {content ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    pre({ children }) {
                      return (
                        <pre className="my-2 overflow-x-auto rounded-lg bg-bg-code p-3 text-xs">
                          {children}
                        </pre>
                      )
                    },
                    code({ className, children, ...props }) {
                      const isInline = !className
                      if (isInline) {
                        return (
                          <code
                            className="rounded bg-bg-input px-1.5 py-0.5 text-xs text-accent-hover"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      }
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      )
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              ) : isStreaming ? (
                ''
              ) : (
                '(empty response)'
              )}
            </div>
          )}
        </div>

        {/* Model badge + streaming indicator below bubble */}
        {!isUser && (model || isStreaming) && (
          <div className="mt-1 flex items-center gap-2 px-1">
            {model && (
              <span className="text-[10px] text-text-muted">
                {getModelName(model)}
              </span>
            )}
            {isStreaming && (
              <span className="inline-flex items-center gap-1 text-[10px] text-accent">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                streaming
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
