import mongoose from 'mongoose';

const taskPatternItemSchema = new mongoose.Schema(
  {
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pattern',
      required: true,
    },
    name_fr: { type: String, default: '', trim: true },
    name_ar: { type: String, default: '', trim: true },
    sku: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    image_url: { type: String, default: '' },
    target_quantity: { type: Number, default: 1, min: 1 },
    size_range: { type: String, default: '' },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    worker_name: {
      type: String,
      required: true,
      trim: true,
    },
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admin_name: {
      type: String,
      required: true,
      trim: true,
    },
    patterns: {
      type: [taskPatternItemSchema],
      default: [],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'Au moins un patron doit être assigné / يجب تحديد باترون واحد على الأقل',
      ],
    },
    message: {
      type: String,
      default: '',
      trim: true,
    },
    due_date: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'acknowledged', 'completed', 'cancelled'],
      default: 'pending',
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
    acknowledged_at: {
      type: Date,
      default: null,
    },
    admin_notified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

taskSchema.index({ worker_id: 1, acknowledged: 1, created_at: -1 });
taskSchema.index({ status: 1 });
taskSchema.index({ created_at: -1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;

