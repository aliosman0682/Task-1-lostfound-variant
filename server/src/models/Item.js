import mongoose from 'mongoose';

export const CATEGORIES = ['electronics', 'clothing', 'documents', 'accessories', 'other'];
export const STATUSES = ['lost', 'found', 'claimed'];

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, enum: CATEGORIES, default: 'other' },
    status: { type: String, enum: STATUSES, default: 'lost' },
    location: { type: String, trim: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// The same item (title) can't be reported twice at the same place.
// Uniqueness is on the pair, so "Blue umbrella" can exist at both the Library and the Gym.
itemSchema.index({ title: 1, location: 1 }, { unique: true });

export const Item = mongoose.model('Item', itemSchema);
