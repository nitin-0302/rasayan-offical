import { Schema, model } from "mongoose";

// Subdocument structure for comments embedded inside post records for rapid reading times
const commentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    avatarURL: {
      type: String,
    },
    text: {
      type: String,
      required: [true, "Comment content cannot be blank"],
      trim: true,
      maxlength: [500, "Comments are limited to 500 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const postSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Crucial index for profiling post feeds
    },
    userEmail: {
      type: String,
      lowercase: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userPhotoURL: {
      type: String,
    },
    postType: {
      type: String,
      enum: ["photo", "video", "blog"],
      default: "photo",
    },
    blogTitle: {
      type: String,
      trim: true,
      maxlength: [120, "Blog/article titles are restricted to 120 characters"],
    },
    imageUrl: {
      type: String,
      required: function(this: any) {
        return this.postType !== "blog";
      },
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [2200, "Instagram limits caption blocks to 2200 characters"],
      default: "",
    },
    hashtags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
      index: true,
    },
    comments: [commentSchema],
    reported: {
      type: Boolean,
      default: false,
      index: true,
    },
    reportsCount: {
      type: Number,
      default: 0,
    },
    reports: [
      {
        userId: Schema.Types.ObjectId,
        userEmail: String,
        reason: String,
        timestamp: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High-speed indices for querying feeds, trending posts, and direct hashtag aggregations
postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1 });
// Composite index for fast trending lookups
postSchema.index({ likesCount: -1, createdAt: -1 });

// Parse out hashtags automatically from the caption before holding it to MongoDB
postSchema.pre("save", function (next) {
  if (this.caption) {
    const rawHashtags = this.caption.match(/#\w+/g);
    if (rawHashtags) {
      this.hashtags = rawHashtags.map((tag) => tag.replace("#", "").toLowerCase());
    } else {
      this.hashtags = [];
    }
  }
  next();
});

export const Post = model("Post", postSchema);
export default Post;
