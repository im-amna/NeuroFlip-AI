'use client'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { extractTextFromPDF } from '@/lib/pdfExtract'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [decks, setDecks] = useState([])
  const [deckName, setDeckName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') fetchDecks()
  }, [status])

  async function fetchDecks() {
    const res = await fetch('/api/decks')
    const data = await res.json()
    setDecks(data.decks || [])
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file || !deckName.trim()) return alert('provide both PDF and deck name!')

    setLoading(true)
    try {
      const text = await extractTextFromPDF(file)
      const res = await fetch('/api/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, deckName })
      })
      const data = await res.json()
      setDeckName('')
      e.target.value = ''
      fetchDecks()
    } catch (err) {
      alert('Error aaya! Console check karo.')
      console.error(err)
    }
    setLoading(false)
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-indigo-700">🧠 NeuroFlip</h1>
            <p className="text-gray-400 mt-1">Welcome, {session?.user?.name}!</p>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-white transition">
            Logout
          </button>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 mb-10">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">➕ New Deck from PDF</h2>
          <div className="flex gap-3 flex-wrap">
            <input className="flex-1 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-48"
              placeholder="Deck name..." value={deckName} onChange={e => setDeckName(e.target.value)} />
            <label className={`cursor-pointer px-5 py-3 rounded-xl font-medium transition text-white
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {loading ? '⏳ Generating...' : '📄 Upload PDF'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={loading} />
            </label>
          </div>
          {loading && (
            <div className="mt-4 flex items-center gap-2 text-indigo-500 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              AI flashcards Generating...
            </div>
          )}
        </div>

        {/* Decks Grid */}
        <h2 className="text-xl font-semibold text-gray-700 mb-4">📚 My Decks ({decks.length})</h2>
        {decks.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📭</p>
            <p>For now there is no Deck .First upload pdf!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {decks.map(deck => (
              <Link key={deck._id} href={`/dashboard/deck/${deck._id}`}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100 hover:shadow-md hover:border-indigo-300 cursor-pointer transition group">
                  <div className="text-4xl mb-4">📖</div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition">{deck.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{deck.cardCount} cards</p>
                  <div className="mt-4 text-xs text-indigo-400 font-medium">Click to study →</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}