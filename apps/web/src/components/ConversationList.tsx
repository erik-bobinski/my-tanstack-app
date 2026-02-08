import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { DEFAULT_MODEL } from '@my-tanstack-app/shared'
import { Plus, Trash2, MessageSquare } from 'lucide-react'

export default function ConversationList() {
  const { data: conversations, isPending } = useQuery(
    convexQuery(api.conversations.list, {}),
  )
  const createConversation = useConvexMutation(api.conversations.create)
  const removeConversation = useConvexMutation(api.conversations.remove)

  // Get conversationId from URL params if we're on a chat page
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
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 p-3">
        <h2 className="text-sm font-semibold text-gray-700">Conversations</h2>
        <button
          onClick={handleNew}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-indigo-500 text-white transition-colors hover:bg-indigo-600"
          title="New conversation"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isPending ? (
          <p className="p-3 text-sm text-gray-500">Loading...</p>
        ) : conversations?.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">
            No conversations yet. Create one!
          </p>
        ) : (
          conversations?.map((conv) => (
            <div
              key={conv._id}
              className={`group flex items-center border-b border-gray-100 ${
                activeId === conv._id ? 'bg-indigo-50' : 'hover:bg-gray-100'
              }`}
            >
              <Link
                to="/chat/$conversationId"
                params={{ conversationId: conv._id }}
                className="flex min-w-0 flex-1 items-center gap-2 p-3 text-sm text-gray-800 no-underline"
              >
                <MessageSquare size={14} className="shrink-0 text-gray-400" />
                <span className="truncate">{conv.title}</span>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeConversation({ id: conv._id })
                }}
                className="mr-2 hidden h-6 w-6 cursor-pointer items-center justify-center rounded bg-transparent text-gray-400 transition-colors hover:text-red-500 group-hover:flex"
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
