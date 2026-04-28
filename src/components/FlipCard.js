'use client'
import { useState } from 'react'

export default function FlipCard({ question, answer, index }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div onClick={() => setFlipped(!flipped)} className="cursor-pointer h-56" style={{ perspective: '1000px' }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
      }}>
        {/* Front - Question */}
        <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0 }}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-md">
          <span className="text-xs font-medium uppercase tracking-widest opacity-70 mb-3">Question {index + 1}</span>
          <p className="text-base font-medium leading-relaxed">{question}</p>
          <span className="text-xs opacity-50 mt-4">tap to flip</span>
        </div>
        {/* Back - Answer */}
        <div style={{ backfaceVisibility: 'hidden', position: 'absolute', inset: 0, transform: 'rotateY(180deg)' }}
          className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white rounded-2xl flex flex-col items-center justify-center p-6 text-center shadow-md">
          <span className="text-xs font-medium uppercase tracking-widest opacity-70 mb-3">Answer</span>
          <p className="text-base leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}