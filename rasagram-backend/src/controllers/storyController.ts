import { Request, Response, NextFunction } from "express";
import Story from "../models/Story.js";
import User from "../models/User.js";
import { broadcastFeedAction } from "../services/socketService.js";

/**
 * Creates temporary story posts (will be automatically deleted in exactly 24 hours by TTL index)
 */
export async function createStory(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { mediaUrl, mediaType } = req.body;

  if (!mediaUrl) {
    return res.status(400).json({ success: false, message: "A story requires a photo or video url source path" });
  }

  try {
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const story = await Story.create({
      userId: user._id,
      userName: user.displayName || user.username,
      userPhotoURL: user.avatarURL,
      mediaUrl,
      mediaType: mediaType || "image",
    });

    // Notify all online followers in real-time that a story went online
    broadcastFeedAction("story_published", {
      storyId: story._id,
      userId: user._id,
      userName: story.userName,
      mediaUrl: story.mediaUrl,
    });

    res.status(201).json({
      success: true,
      message: "Story published! This post will expire in 24 hours.",
      story,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves all active stories published by the creators that the user follows
 */
export async function getStoriesFeed(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;

  try {
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account context was not found" });
    }

    // Include the user's own stories as well as those of people they follow
    const activeCircleIds = [...user.following, user._id];

    // Find and return active, unexpired stories sorted chronologically
    const stories = await Story.find({
      userId: { $in: activeCircleIds },
      expiresAt: { $gt: new Date() } // Double check to only fetch non-expired content matching local time
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      stories,
    });
  } catch (err) {
    next(err);
  }
}
