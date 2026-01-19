import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">
        Welcome to your App
      </h1>
      <p className="text-gray-600 text-lg mb-8">
        Built with TanStack Start + Convex + Bun
      </p>

      <Link
        to="/demo/notes"
        className="px-6 py-3 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors"
      >
        Go to Notes →
      </Link>
    </div>
  )
}
