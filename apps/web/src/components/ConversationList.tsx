import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { DEFAULT_MODEL } from '@my-tanstack-app/shared'
import { Plus, Trash2, MessageSquare, Home } from 'lucide-react'

export default function ConversationList() {
  const { data: conversations, isPending } = useQuery(
    convexQuery(api.conversations.list, {}),
  )
  const createConversation = useConvexMutation(api.conversations.create)
  const removeConversation = useConvexMutation(api.conversations.remove)

  const params = useParams({ strict: false }) as { conversationId?: string }
  const activeId = params.conversationId

  const handleNew = async () => {
    const id = await createConversation({
      title: 'New Chat',
      model: DEFAULT_MODEL,
    })
    window.location.href = `/chat/${id}`
  }

  return (
    <div className="flex h-full w-64 flex-col border-r border-border-subtle bg-bg-sidebar">
      {/* App title + nav */}
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-3">
        <MessageSquare size={16} className="text-accent" />
        <span className="text-sm font-semibold text-text-primary">AI Chat</span>
        <Link
          to="/"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-surface hover:text-text-secondary"
          title="Home"
        >
          <Home size={14} />
        </Link>
      </div>

      {/* New conversation button */}
      <div className="border-b border-border-subtle p-2">
        <button
          onClick={handleNew}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
          title="New conversation"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <p className="p-3 text-sm text-text-muted">Loading...</p>
        ) : conversations?.length === 0 ? (
          <p className="p-3 text-sm text-text-muted">
            No conversations yet. Create one!
          </p>
        ) : (
          conversations?.map((conv) => (
            <div
              key={conv._id}
              className={`group flex items-center border-b border-border-subtle/50 ${
                activeId === conv._id
                  ? 'bg-bg-user-bubble'
                  : 'hover:bg-bg-surface'
              }`}
            >
              <Link
                to="/chat/$conversationId"
                params={{ conversationId: conv._id }}
                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-sm text-text-primary no-underline"
              >
                <MessageSquare
                  size={13}
                  className="shrink-0 text-text-muted"
                />
                <span className="truncate">{conv.title}</span>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeConversation({ id: conv._id })
                }}
                className="mr-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded text-text-muted transition-colors hover:text-red-400 group-hover:flex"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
