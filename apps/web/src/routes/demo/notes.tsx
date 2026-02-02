import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'

export const Route = createFileRoute('/demo/notes')({
  component: NotesDemo,
})

function NotesDemo() {
  const [newNote, setNewNote] = useState('')

  // Query: fetches notes and updates in real-time!
  const { data: notes, isPending } = useQuery(convexQuery(api.notes.list, {}))

  // Mutations: add and remove notes
  const addNote = useConvexMutation(api.notes.add)
  const removeNote = useConvexMutation(api.notes.remove)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    await addNote({ text: newNote.trim() })
    setNewNote('')
  }

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">📝 Notes Demo</h1>
      <p className="text-gray-600 mb-8 leading-relaxed">
        This demonstrates Convex real-time queries and mutations with TanStack Query.
        <br />
        <strong>Try opening this page in two browser tabs</strong> — changes sync instantly!
      </p>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write a note..."
          className="flex-1 px-4 py-3 text-base border-2 border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          type="submit"
          className="px-6 py-3 text-base bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition-colors cursor-pointer"
        >
          Add Note
        </button>
      </form>

      {/* Notes list */}
      <div className="flex flex-col gap-2">
        {isPending ? (
          <p className="text-center text-gray-500 py-8">Loading notes...</p>
        ) : notes?.length === 0 ? (
          <p className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
            No notes yet. Add one above!
          </p>
        ) : (
          notes?.map((note) => (
            <div
              key={note._id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="flex-1 text-gray-800">{note.text}</span>
              <button
                onClick={() => removeNote({ id: note._id })}
                className="w-8 h-8 flex items-center justify-center bg-transparent text-red-500 border border-red-500 rounded-md cursor-pointer hover:bg-red-500 hover:text-white transition-colors"
                title="Delete note"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Feature callouts */}
      <div className="mt-12 p-6 bg-sky-50 rounded-lg border border-sky-200">
        <h3 className="m-0 mb-4 text-sky-700 font-semibold">What's happening here:</h3>
        <ul className="m-0 pl-5 leading-loose text-slate-700">
          <li><code className="bg-sky-100 px-1 rounded">useQuery(convexQuery(...))</code> — Fetches data and auto-updates when it changes</li>
          <li><code className="bg-sky-100 px-1 rounded">useConvexMutation(...)</code> — Calls server mutations to modify data</li>
          <li><strong>Real-time sync</strong> — No polling, no refetching, just instant updates</li>
        </ul>
      </div>
    </div>
  )
}
