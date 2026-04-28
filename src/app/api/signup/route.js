import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import User from '@/models/User'

export async function POST(req) {
  try {
    const body = await req.json()
    console.log('BODY RECEIVED:', body)

    const { name, email, password } = body

    if (!name || !email || !password) {
      console.log('MISSING FIELDS:', { name, email, password })
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      )
    }

    console.log('Connecting to DB...')
    await connectDB()
    console.log('DB Connected!')

    const existing = await User.findOne({ email })
    console.log('Existing user:', existing)
    
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(password, 10)
    console.log('Password hashed!')

    await User.create({
      name,
      email,
      password: hashed
    })
    console.log('User created!')

    return NextResponse.json({ message: 'Account created!' })

  } catch (err) {
    console.log('ERROR:', err.message)
    console.log('FULL ERROR:', err)

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}