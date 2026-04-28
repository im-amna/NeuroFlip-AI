import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { connectDB } from '@/lib/mongodb'
import Deck from '@/models/Deck'

// GET — all decks of logged in user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const decks = await Deck.find({ userId: session.user.id }).sort({ createdAt: -1 })
  return NextResponse.json({ decks })
}

// POST — create new deck
export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()
  await connectDB()
  const deck = await Deck.create({ name, userId: session.user.id })
  return NextResponse.json({ deck })
}