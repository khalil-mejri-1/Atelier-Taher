import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema(
  {
    worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    pieces_count: {
      type: Number,
      default: 0,
    },
    days_count: {
      type: Number,
      default: 0,
    },
    settled_dates: [
      {
        type: String, // 'YYYY-MM-DD'
      },
    ],
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

settlementSchema.index({ created_at: -1 });

const Settlement = mongoose.model('Settlement', settlementSchema);
export default Settlement;
