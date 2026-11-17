import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    action_type: {
      type: String,
      required: true,
      enum: [
        'production_increment',
        'production_custom',
        'production_undo',
        'order_deduct',
        'order_undo',
        'log_delete',
        'stock_bulk_adjust',
        'pattern_create',
        'pattern_update',
        'pattern_delete',
        'user_create',
        'user_status',
      ],
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    user_name: {
      type: String,
      required: true,
      trim: true,
    },
    user_role: {
      type: String,
      required: true,
      enum: ['admin', 'worker'],
    },
    pattern_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pattern',
      default: null,
    },
    pattern_name: {
      type: String,
      default: '',
    },
    pattern_sku: {
      type: String,
      default: '',
    },
    quantity_changed: {
      type: Number,
      default: 0,
    },
    previous_stock: {
      type: Number,
      default: 0,
    },
    new_stock: {
      type: Number,
      default: 0,
    },
    unit_price: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_price: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    undone: {
      type: Number, // 0 for active, 1 for undone (matches frontend expectation)
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

activityLogSchema.index({ created_at: -1 });
activityLogSchema.index({ action_type: 1 });
activityLogSchema.index({ user_id: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;

