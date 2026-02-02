import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="flex justify-between gap-2 bg-white p-2 border-b border-gray-200">
      <nav className="flex flex-row">
        <div className="px-2 font-semibold">
          <Link to="/" className="text-gray-800 hover:text-indigo-600 transition-colors">
            Home
          </Link>
        </div>

        <div className="px-2 font-semibold">
          <Link to="/demo/notes" className="text-gray-800 hover:text-indigo-600 transition-colors">
            Notes
          </Link>
        </div>
      </nav>
    </header>
  )
}
