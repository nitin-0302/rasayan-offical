import { Request, Response, NextFunction } from "express";
import Notification from "../models/Notification.js";

/**
 * Loads recent alerts chronologically for the logged-in user
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;

  try {
    const notifications = await Notification.find({ recipientId: currentUserId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Marks all pending notification alerts as read for the user
 */
export async function markNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;

  try {
    await Notification.updateMany(
      { recipientId: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      message: "All pending notifications successfully updated to read state.",
    });
  } catch (err) {
    next(err);
  }
}
