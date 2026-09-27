import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      required: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },
        isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
},
{
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);