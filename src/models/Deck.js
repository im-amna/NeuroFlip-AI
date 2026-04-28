import mongoose from 'mongoose'

const DeckSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardCount: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.models.Deck || mongoose.model('Deck', DeckSchema)