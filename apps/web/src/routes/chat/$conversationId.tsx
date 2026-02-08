import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation, useConvexAction } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import type { Id } from 'convex/_generated/dataModel'
import { DEFAULT_MODEL } from '@my-tanstack-app/shared'
import ConversationList from '../../components/ConversationList'
import ChatMessage from '../../components/ChatMessage'
import ChatInput from '../../components/ChatInput'

export const Route = createFileRoute('/chat/$conversationId')({
  component: ChatView,
})

function ChatView() {
  const { conversationId } = Route.useParams()
  const convexId = conversationId as Id<'conversations'>

  const { data: conversation } = useQuery(
    convexQuery(api.conversations.get, { id: convexId }),
  )
  const { data: messages, isPending: messagesLoading } = useQuery(
    convexQuery(api.messages.list, { conversationId: convexId }),
  )

  const sendChat = useConvexAction(api.chat.send)
  const updateModel = useConvexMutation(api.conversations.updateModel)

  const [model, setModel] = useState(DEFAULT_MODEL)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conversation?.model) {
      setModel(conversation.model)
    }
  }, [conversation?.model])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [messages])

  const handleSend = async (content: string) => {
    setSending(true)
    try {
      await sendChat({
        conversationId: convexId,
        content,
        model,
      })
    } finally {
      setSending(false)
    }
  }

  const handleModelChange = (newModel: string) => {
    setModel(newModel)
    updateModel({ id: convexId, model: newModel })
  }

  const isStreaming = messages?.some((m) => m.isStreaming) ?? false

  return (
    <div className="flex h-screen">
      <ConversationList />
      <div className="flex flex-1 flex-col bg-bg-main">
        {/* Chat header */}
        <div className="flex items-center border-b border-border-subtle px-4 py-2">
          <h2 className="text-sm font-semibold text-text-secondary">
            {conversation?.title ?? 'Chat'}
          </h2>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messagesLoading ? (
            <p className="p-4 text-center text-sm text-text-muted">
              Loading messages...
            </p>
          ) : messages?.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages?.map((msg) => (
                <ChatMessage
                  key={msg._id}
                  role={msg.role}
                  content={msg.content}
                  model={msg.model}
                  isStreaming={msg.isStreaming}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          model={model}
          onModelChange={handleModelChange}
          disabled={sending || isStreaming}
        />
      </div>
    </div>
  )
}
