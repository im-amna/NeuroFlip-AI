import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import Flashcard from '@/models/Flashcard'
import Deck from '@/models/Deck'

export async function GET(req, { params }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await connectDB()
  const deck = await Deck.findById(id)
  const cards = await Flashcard.find({ deckId: id })
  return NextResponse.json({ deck, cards })
}