import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="flex justify-between gap-2 border-b border-gray-200 bg-white p-2">
      <nav className="flex flex-row">
        <div className="px-2 font-semibold">
          <Link
            to="/"
            className="text-gray-800 transition-colors hover:text-indigo-600"
          >
            Home
          </Link>
        </div>

        <div className="px-2 font-semibold">
          <Link
            to="/chat"
            className="text-gray-800 transition-colors hover:text-indigo-600"
          >
            Chat
          </Link>
        </div>
      </nav>
    </header>
  )
}
