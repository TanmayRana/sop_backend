import { Schema, model } from 'mongoose';

const pendingSignupSchema = new Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    otpLastSentAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-delete after 1 hour if not verified
pendingSignupSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 });

const PendingSignup = model('PendingSignup', pendingSignupSchema);
export default PendingSignup;
