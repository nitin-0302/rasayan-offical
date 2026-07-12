import { Schema, model } from "mongoose";

const storySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userPhotoURL: {
      type: String,
    },
    mediaUrl: {
      type: String,
      required: [true, "Story content is representing visual frames and cannot be empty"],
    },
    mediaType: {
      type: String,
      enum: ["image", "video"],
      default: "image",
    },
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // TTL Database Scheduler: MongoDB uses background threads to destroy records once matching local clock
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Exactly 24 hours from current instant
      index: { expires: 0 }, // Triggers direct Mongo deletion sweep safely
    },
  },
  {
    timestamps: true,
  }
);

export const Story = model("Story", storySchema);
export default Story;
