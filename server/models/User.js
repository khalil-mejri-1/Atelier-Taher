import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'worker'],
      default: 'worker',
      required: true,
    },
    pin: {
      type: String,
      trim: true,
      default: '1234',
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    in_progress_patterns: [
      {
        pattern_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pattern' },
        printed_parts: [{ type: String }],
        updated_at: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Method to verify password
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.password);
};

// Hash password before saving if modified
userSchema.pre('save', function () {
  if (this.isModified('password')) {
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
  }
});

const User = mongoose.model('User', userSchema);
export default User;

