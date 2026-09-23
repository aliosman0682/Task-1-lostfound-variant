import Joi from 'joi';
import mongoose from 'mongoose';
import { Item, CATEGORIES, STATUSES } from '../models/Item.js';

// Trim first so an id copied with stray spaces/newlines still validates.
const objectId = Joi.string().trim().hex().length(24)
  .messages({ '*': '{{#label}} must be a valid user id (24 hex characters, e.g. from GET /api/users)' });

const createSchema = Joi.object({
  title: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(1000).allow(''),
  category: Joi.string().valid(...CATEGORIES),
  status: Joi.string().valid(...STATUSES),
  location: Joi.string().trim().max(200),
  reportedBy: objectId
});

// Same fields as create, but nothing is required and an empty body is rejected.
const updateSchema = createSchema
  .fork(['title'], (field) => field.optional())
  .min(1);

const filterSchema = Joi.object({
  status: Joi.string().valid(...STATUSES),
  category: Joi.string().valid(...CATEGORIES)
});

// Only expose the user's public fields, never the password hash.
const REPORTER_FIELDS = 'name email';

function badId(res) {
  return res.status(400).json({ message: 'Invalid item id' });
}

function duplicate(res) {
  return res.status(409).json({ message: 'An item with this title is already reported at this location' });
}

// GET /api/items?status=lost&category=electronics
export async function getAllItems(req, res, next) {
  try {
    const { value: filter, error } = filterSchema.validate(req.query, { stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const items = await Item.find(filter)
      .populate('reportedBy', REPORTER_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items });
  } catch (err) { next(err); }
}

// GET /api/items/:id
export async function getItem(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

    const item = await Item.findById(req.params.id).populate('reportedBy', REPORTER_FIELDS).lean();
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ item });
  } catch (err) { next(err); }
}

// POST /api/items
export async function createItem(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const item = await Item.create(value);
    res.status(201).json({ item });
  } catch (err) {
    if (err.code === 11000) return duplicate(res);
    next(err);
  }
}

// PATCH /api/items/:id
export async function updateItem(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

    const { value, error } = updateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.message });

    const item = await Item.findByIdAndUpdate(req.params.id, { $set: value }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ item });
  } catch (err) {
    if (err.code === 11000) return duplicate(res);
    next(err);
  }
}

// DELETE /api/items/:id
export async function deleteItem(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);

    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
