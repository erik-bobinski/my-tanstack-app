import { createFileRoute } from '@tanstack/react-router'
import { useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { DEFAULT_MODEL } from '@my-tanstack-app/shared'
import { useNavigate } from '@tanstack/react-router'
import { MessageSquare, Plus } from 'lucide-react'
import ConversationList from '../../components/ConversationList'

export const Route = createFileRoute('/chat/')({ component: ChatIndex })

function ChatIndex() {
  const createConversation = useConvexMutation(api.conversations.create)
  const navigate = useNavigate()

  const handleNew = async () => {
    const id = await createConversation({
      title: 'New Chat',
      model: DEFAULT_MODEL,
    })
    navigate({ to: '/chat/$conversationId', params: { conversationId: id } })
  }

  return (
    <div className="flex h-[calc(100vh-41px)]">
      <ConversationList />
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <MessageSquare size={48} className="mb-4 text-gray-300" />
        <h2 className="mb-2 text-xl font-semibold text-gray-700">
          Select a conversation
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          Pick one from the sidebar or start a new chat.
        </p>
        <button
          onClick={handleNew}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
        >
          <Plus size={16} />
          New Conversation
        </button>
      </div>
    </div>
  )
}
