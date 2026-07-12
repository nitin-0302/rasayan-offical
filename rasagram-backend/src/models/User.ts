import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";

// User database contract defining profiles, counts, counters, and credentials
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must hold at least 3 characters"],
      maxlength: [30, "Username can hold at most 30 characters"],
      index: true, // Speeds up search queries and direct lookups
    },
    email: {
      type: String,
      required: [true, "Email contract is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required for native authentication"],
      minlength: [6, "Password must have at least 6 characters"],
      select: false, // Prevents unintended leaks on standard document retrievals
    },
    displayName: {
      type: String,
      trim: true,
      default: function(this: any) {
        return this.username;
      }
    },
    avatarURL: {
      type: String,
      default: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250",
    },
    bio: {
      type: String,
      maxlength: [220, "Bio is restricted to 220 characters max"],
      default: "",
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Cached counters to secure optimal retrieval time under high user load
    followersCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
    postsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Dynamic Composite search index for rapid creator searching matching prefixes
userSchema.index({ username: "text", displayName: "text" });

// Auto hash passwords prior to persist actions safely
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method mapping to verify passwords cleanly in controller scope
userSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = model("User", userSchema);
export default User;
