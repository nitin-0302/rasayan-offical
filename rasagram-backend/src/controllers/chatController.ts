import { Request, Response, NextFunction } from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";

/**
 * Loads conversation logs between the logged-in user and a target chat partner
 */
export async function getChatHistory(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { partnerUserId } = req.params;

  try {
    const dialogLogs = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: partnerUserId },
        { senderId: partnerUserId, receiverId: currentUserId },
      ],
    })
      .sort({ createdAt: 1 }) // Chronological order
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      messages: dialogLogs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save new direct message to DB (runs as fallback if socket fails or during API-focused chat workflows)
 */
export async function saveDirectMessage(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { receiverId, text } = req.body;

  if (!receiverId || !text || text.trim() === "") {
    return res.status(400).json({ success: false, message: "Target receiver and content body are required." });
  }

  try {
    const receiverExists = await User.findById(receiverId);
    if (!receiverExists) {
      return res.status(404).json({ success: false, message: "Receiver account not found." });
    }

    const newMessage = await Message.create({
      senderId: currentUserId,
      receiverId,
      text: text.trim(),
    });

    res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (err) {
    next(err);
  }
}
