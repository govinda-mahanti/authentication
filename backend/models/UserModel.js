
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    surname: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
    },

    dob: {
      type: Date,
      required: true,
    },

    // OTP verification details
    otpHash: {
      type: String,
    },

    otpExpiresAt: {
      type: Date,
    },

    failedAttempts: {
      type: Number,
      default: 0,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    // Current login session
    activeSessionId: {
      type: String,
      default: null,
    },

    // Passkey authentication
    currentChallenge: {
      type: String,
    },

    credentials: {
      type: [
        {
          credentialID: String,
          credentialPublicKey: String,
          counter: Number,
          transports: [String],
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
