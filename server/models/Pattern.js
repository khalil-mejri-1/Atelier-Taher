import mongoose from 'mongoose';

const patternSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
      default: () => 'PAT-' + Math.floor(100000 + Math.random() * 900000),
    },
    name_ar: {
      type: String,
      default: '',
      trim: true,
    },
    name_fr: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    current_stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    low_stock_threshold: {
      type: Number,
      required: true,
      default: 10,
      min: 1,
    },
    size_range: {
      type: String,
      default: 'S - XXL',
      trim: true,
    },
    material_type: {
      type: String,
      default: 'كرتون كرافت 350غ',
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    image_url: {
      type: String,
      default: '',
      trim: true,
    },
    has_parts: {
      type: Boolean,
      default: false,
    },
    parts: [
      {
        id: {
          type: String,
          default: () => 'part_' + Math.random().toString(36).substring(2, 9),
        },
        name: {
          type: String,
          default: '',
          trim: true,
        },
        name_ar: {
          type: String,
          default: '',
          trim: true,
        },
      },
    ],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for fast sorting, filtering and lightning-fast searching
patternSchema.index({ name_fr: 1 });
patternSchema.index({ name_ar: 1 });
patternSchema.index({ category: 1 });
patternSchema.index({ current_stock: 1 });
patternSchema.index({ name_fr: 'text', name_ar: 'text', sku: 'text' });

const Pattern = mongoose.model('Pattern', patternSchema);
export default Pattern;
