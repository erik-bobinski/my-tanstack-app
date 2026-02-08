import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="mb-2 text-4xl font-bold text-gray-900">AI Chat</h1>
      <p className="mb-8 text-lg text-gray-600">
        Stream LLM responses via OpenRouter. Synced between web and CLI.
      </p>

      <Link
        to="/chat"
        className="rounded-lg bg-indigo-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-600"
      >
        Open Chat
      </Link>
    </div>
  )
}
