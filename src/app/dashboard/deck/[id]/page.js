"use client";
import React from "react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import FlipCard from "@/components/FlipCard";
import Link from "next/link";

export default function DeckPage({ params }) {
  const { status } = useSession();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const router = useRouter();
  const { id } = React.use(params);
  console.log(id);
  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetch(`/api/decks/${id}`)
        .then((r) => r.json())
        .then((d) => {
          setDeck(d.deck);
          setCards(d.cards);
        });
    }
  }, [status]);

  if (!deck)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading deck...
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="text-indigo-500 hover:text-indigo-700 font-medium"
          >
            ← Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-2xl font-bold text-gray-800">{deck.name}</h1>
          <span className="bg-indigo-100 text-indigo-600 text-sm px-3 py-1 rounded-full font-medium">
            {cards.length} cards
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-8">
          💡 Card tap  — Answer flip for Questions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card, i) => (
            <FlipCard
              key={card._id}
              question={card.question}
              answer={card.answer}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
