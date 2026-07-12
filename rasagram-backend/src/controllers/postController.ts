import { Request, Response, NextFunction } from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { broadcastFeedAction, sendNotificationToUser } from "../services/socketService.js";

/**
 * Upload an Image/Video Post or publish a rich Text Blog Article
 */
export async function createPost(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { postType, blogTitle, caption, imageUrl } = req.body;

  try {
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Host user account not found!" });
    }

    const newPost = await Post.create({
      userId: user._id,
      userName: user.displayName || user.username,
      userPhotoURL: user.avatarURL,
      userEmail: user.email,
      postType: postType || "photo",
      blogTitle,
      imageUrl,
      caption,
    });

    // Update users total posts cached count metric
    user.postsCount = (user.postsCount || 0) + 1;
    await user.save();

    // Broadcast action to notify all active subscribers in real-time
    broadcastFeedAction("post_created", {
      id: newPost._id,
      userName: newPost.userName,
      imageUrl: newPost.imageUrl,
      caption: newPost.caption,
    });

    res.status(201).json({
      success: true,
      message: "Post published to Rasagram safely!",
      post: newPost
    });
  } catch (err) {
    next(err);
  }
}

/**
 * High Performance Feed Algorithm with Cursor Pagination (Scales beautifully to 100,000+ users)
 * 1. Prioritizes content uploaded by creators the user follows.
 * 2. Integrates popular/trending fallback publications if the timeline is thin.
 * 3. Utilizes indexed queries for lightning-fast database responses.
 */
export async function getFeed(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const limit = parseInt(req.query.limit as string) || 15;
  const cursor = req.query.cursor as string; // Standard ISO Date string cursor

  try {
    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Build timeline matching filter rules
    const targetCreationsIds = [...user.following, user._id];
    
    // Construct query parameters using the timestamp cursor
    const queryConditions: any = {
      userId: { $in: targetCreationsIds },
    };

    if (cursor) {
      queryConditions.createdAt = { $lt: new Date(cursor) };
    }

    let posts = await Post.find(queryConditions)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // FALLBACK CHANNELS: If the user follows very few people, we inject popular, recent public activity
    if (posts.length < limit) {
      const excludedIds = posts.map((p) => p._id);
      const remainingSlots = limit - posts.length;

      const fallbackQuery: any = {
        _id: { $not: { $in: excludedIds } },
      };

      if (cursor) {
        fallbackQuery.createdAt = { $lt: new Date(cursor) };
      }

      const fallbackPosts = await Post.find(fallbackQuery)
        .sort({ likesCount: -1, createdAt: -1 }) // Sort by popularity + date
        .limit(remainingSlots)
        .lean();

      posts = [...posts, ...fallbackPosts];
    }

    // Construct next page cursor string
    const nextCursor = posts.length > 0 ? posts[posts.length - 1].createdAt : null;

    res.status(200).json({
      success: true,
      posts,
      nextCursor,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle Likings trigger (like and unlike a post dynamically)
 */
export async function toggleLikePost(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Target post not found." });
    }

    const curUser = await User.findById(currentUserId);
    if (!curUser) {
      return res.status(404).json({ success: false, message: "Current user context not found." });
    }

    const hasAlreadyLiked = post.likedBy.includes(currentUserId);
    let operationType: "post_liked" | "post_unliked" = "post_liked";

    if (hasAlreadyLiked) {
      // Unlike post process
      post.likedBy = post.likedBy.filter((id) => id.toString() !== currentUserId);
      operationType = "post_unliked";
    } else {
      // Like post process
      post.likedBy.push(currentUserId);
    }

    post.likesCount = post.likedBy.length;
    await post.save();

    // Real-time broad notification update on post cards
    broadcastFeedAction(operationType, { postId, likesCount: post.likesCount, userId: currentUserId });

    // Handle activity logs push if they liked the post
    if (!hasAlreadyLiked && post.userId.toString() !== currentUserId) {
      const createdNotification = await Notification.create({
        recipientId: post.userId,
        senderId: currentUserId,
        senderName: curUser.displayName || curUser.username,
        senderAvatar: curUser.avatarURL,
        type: "like",
        postId: post._id,
        text: `liked your post: "${post.caption?.substring(0, 30)}..."`,
      });

      sendNotificationToUser(post.userId.toString(), createdNotification);
    }

    res.status(200).json({
      success: true,
      likesCount: post.likesCount,
      hasLiked: !hasAlreadyLiked,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Post commentaries into discussion boards inside individual posts
 */
export async function addComment(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { postId } = req.params;
  const { text } = req.body;

  if (!text || text.trim() === "") {
    return res.status(400).json({ success: false, message: "Comment contents cannot be empty." });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Target post not found." });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account context not found." });
    }

    const newComment = {
      userId: user._id,
      username: user.displayName || user.username,
      avatarURL: user.avatarURL,
      text: text.trim(),
      createdAt: new Date(),
    };

    post.comments.push(newComment as any);
    await post.save();

    // Broadcast feed action immediately across active timelines in real-time
    broadcastFeedAction("comment_added", { postId, comment: post.comments[post.comments.length - 1] });

    // Push standard action logging alerting to post publisher
    if (post.userId.toString() !== currentUserId) {
      const createdNotification = await Notification.create({
        recipientId: post.userId,
        senderId: currentUserId,
        senderName: user.displayName || user.username,
        senderAvatar: user.avatarURL,
        type: "comment",
        postId: post._id,
        text: `commented: "${text.substring(0, 35)}..." on your post`,
      });

      sendNotificationToUser(post.userId.toString(), createdNotification);
    }

    res.status(201).json({
      success: true,
      comment: post.comments[post.comments.length - 1],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle hashtag, profiles, and post text matching discovery algorithms
 */
export async function searchContent(req: Request, res: Response, next: NextFunction) {
  const queryParam = req.query.q as string;
  
  if (!queryParam || queryParam.trim() === "") {
    return res.status(400).json({ success: false, message: "Search query is required." });
  }

  try {
    const cleanQuery = queryParam.trim();

    // 1. Seek matches from registered users
    const matchedUsers = await User.find({
      $or: [
        { username: { $regex: cleanQuery, $options: "i" } },
        { displayName: { $regex: cleanQuery, $options: "i" } },
      ],
    })
      .limit(10)
      .select("username displayName avatarURL followersCount");

    // 2. Seek matches from hashtags inside post documents
    const matchedPosts = await Post.find({
      $or: [
        { hashtags: { $in: [cleanQuery.toLowerCase()] } },
        { caption: { $regex: cleanQuery, $options: "i" } },
        { blogTitle: { $regex: cleanQuery, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(15);

    res.status(200).json({
      success: true,
      results: {
        users: matchedUsers,
        posts: matchedPosts,
      },
    });
  } catch (err) {
    next(err);
  }
}
