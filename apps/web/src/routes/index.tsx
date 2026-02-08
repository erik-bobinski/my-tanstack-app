import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-main p-8 text-center">
      <h1 className="mb-2 text-4xl font-bold text-text-primary">AI Chat</h1>
      <p className="mb-8 text-lg text-text-secondary">
        Stream LLM responses via OpenRouter. Synced between web and CLI.
      </p>

      <Link
        to="/chat"
        className="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Open Chat
      </Link>
    </div>
  )
}
