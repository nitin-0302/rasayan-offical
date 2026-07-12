import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper function to bundle user details into a high-grade JWT
function generateToken(userId: string, email: string, username: string): string {
  const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_secret_rasagram";
  return jwt.sign({ userId, email, username }, JWT_SECRET, {
    expiresIn: "30d", // Active session persists for 30 consecutive days
  });
}

/**
 * Handle new user sign up / registration
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  const { username, email, password, displayName, bio } = req.body;

  try {
    // Check if the user is already registered in the system
    const userExists = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "A user profile matching this email address or username already exists.",
      });
    }

    const newUser = await User.create({
      username,
      email,
      password,
      displayName,
      bio,
    });

    const token = generateToken(newUser._id.toString(), newUser.email, newUser.username);

    res.status(201).json({
      success: true,
      message: "Registration completed successfully! Welcome to Rasagram.",
      token,
      user: {
        userId: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
        email: newUser.email,
        avatarURL: newUser.avatarURL,
        bio: newUser.bio,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log in / authenticate an existing user
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({
      success: false,
      message: "Please specify your login credentials (username/email + password).",
    });
  }

  try {
    // Match either email or lowercase username format
    const searchParam = emailOrUsername.toString().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: searchParam }, { username: searchParam }],
    }).select("+password"); // Need to explicitly select the select:false password field

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No accounts match the credentials entered.",
      });
    }

    // Verify raw input against database hash
    const isMatched = await (user as any).matchPassword(password);
    if (!isMatched) {
      return res.status(401).json({
        success: false,
        message: "Login failed! The password you entered is incorrect.",
      });
    }

    const token = generateToken(user._id.toString(), user.email, user.username);

    res.status(200).json({
      success: true,
      message: "Sign in successful! Welcome back to Rasagram.",
      token,
      user: {
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarURL: user.avatarURL,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle user profile updates (including bio, display name, and avatar)
 */
export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.userId;
  const { displayName, bio, avatarURL } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    if (displayName) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatarURL) user.avatarURL = avatarURL;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile credentials updated successfully!",
      user: {
        userId: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarURL: user.avatarURL,
        bio: user.bio,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Follow or Unfollow a target user profile
 */
export async function toggleFollowUser(req: Request, res: Response, next: NextFunction) {
  const currentUserId = (req as any).user?.userId;
  const { targetUserId } = req.body;

  if (currentUserId === targetUserId) {
    return res.status(400).json({ success: false, message: "You cannot follow your own account credentials!" });
  }

  try {
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ success: false, message: "One of the target user accounts was not found." });
    }

    const isFollowing = currentUser.following.includes(targetUser._id as any);

    if (isFollowing) {
      // Unfollow operational queue
      currentUser.following = currentUser.following.filter((id) => id.toString() !== targetUser._id.toString());
      targetUser.followers = targetUser.followers.filter((id) => id.toString() !== currentUser._id.toString());
    } else {
      // Follow operational queue
      currentUser.following.push(targetUser._id as any);
      targetUser.followers.push(currentUser._id as any);
    }

    // Refresh count metrics dynamically
    currentUser.followersCount = currentUser.followers.length;
    currentUser.followingCount = currentUser.following.length;
    targetUser.followersCount = targetUser.followers.length;
    targetUser.followingCount = targetUser.following.length;

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      success: true,
      isFollowing: !isFollowing,
      message: isFollowing
        ? `Successfully unfollowed @${targetUser.username}`
        : `Successfully followed @${targetUser.username}`,
      currentUserCounts: {
        followersCount: currentUser.followersCount,
        followingCount: currentUser.followingCount,
      },
    });
  } catch (err) {
    next(err);
  }
}
