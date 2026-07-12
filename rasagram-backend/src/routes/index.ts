import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { authLimiter, primaryApiLimiter } from "../middleware/rateLimiter.js";
import { register, login, updateProfile, toggleFollowUser } from "../controllers/authController.js";
import { createPost, getFeed, toggleLikePost, addComment, searchContent } from "../controllers/postController.js";
import { createStory, getStoriesFeed } from "../controllers/storyController.js";
import { getNotifications, markNotificationsAsRead } from "../controllers/notificationController.js";
import { getChatHistory, saveDirectMessage } from "../controllers/chatController.js";
import { upload } from "../config/cloudinary.js";

const router = Router();

// Rate limiting globally on all endpoints to protect container system memory
router.use(primaryApiLimiter);

/* =========================================
   1. USER MANAGEMENT & AUTHENTICATION (JWT)
   ========================================= */
router.post("/auth/register", authLimiter, register);
router.post("/auth/login", authLimiter, login);
router.put("/auth/profile", protect, updateProfile);
router.post("/auth/follow", protect, toggleFollowUser);

/* =========================================
   2. IMAGES, VIDEOS, POSTS & DISCOVERIES
   ========================================= */
// Upload handler pipes file stream directly into Cloudinary CDN
router.post("/posts", protect, upload.single("media"), createPost);
router.get("/posts/feed", protect, getFeed);
router.post("/posts/:postId/like", protect, toggleLikePost);
router.post("/posts/:postId/comment", protect, addComment);
router.get("/posts/search", protect, searchContent);

/* =========================================
   3. DISAPPEARING STORIES (24h AUTO EXPIRES)
   ========================================= */
router.post("/stories", protect, upload.single("media"), createStory);
router.get("/stories/feed", protect, getStoriesFeed);

/* =========================================
   4. CENTRALIZED NOTIFICATION SYSTEMS
   ========================================= */
router.get("/notifications", protect, getNotifications);
router.put("/notifications/read", protect, markNotificationsAsRead);

/* =========================================
   5. REAL-TIME DIRECT GRAPH DISCUSSIONS (CHAT)
   ========================================= */
router.get("/chat/history/:partnerUserId", protect, getChatHistory);
router.post("/chat/messages", protect, saveDirectMessage);

export default router;
