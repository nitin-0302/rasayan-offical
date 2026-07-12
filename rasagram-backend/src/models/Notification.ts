import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Speeds up check queries for notification badges
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    senderAvatar: {
      type: String,
    },
    type: {
      type: String,
      enum: ["like", "comment", "follow"],
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    text: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = model("Notification", notificationSchema);
export default Notification;
