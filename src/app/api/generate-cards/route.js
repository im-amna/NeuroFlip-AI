import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import Groq from 'groq-sdk'
import { connectDB } from '@/lib/mongodb'
import Deck from '@/models/Deck'
import Flashcard from '@/models/Flashcard'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function POST(req) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text, deckName } = await req.json()

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{
      role: 'user',
      content: `Generate 8 flashcard question-answer pairs from this text.
Return ONLY a valid JSON array, no explanation, no markdown backticks:
[{"question": "...", "answer": "..."}, ...]

Text: ${text.slice(0, 3000)}`
    }],
    max_tokens: 1024,
  })

  const raw = completion.choices[0].message.content.replace(/```json|```/g, '').trim()
  const cards = JSON.parse(raw)

  await connectDB()
  const deck = await Deck.create({ name: deckName, userId: session.user.id, cardCount: cards.length })
  const flashcards = cards.map(c => ({ ...c, deckId: deck._id }))
  await Flashcard.insertMany(flashcards)

  return NextResponse.json({ deckId: deck._id })
}