import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, "Single direct messages are capped at 2000 characters"],
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// High speed Index to seek entire direct dialog logs chronologically in a flash
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export const Message = model("Message", messageSchema);
export default Message;
