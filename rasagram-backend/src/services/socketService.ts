import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

// Maps to fast-retrieve active connection references (userId -> SocketID[])
// We use arrays to enable multi-device logins (simultaneous streaming on phone + browser)
const activeConnections = new Map<string, string[]>();

let ioInstance: Server | null = null;

export function initSocketServer(server: HttpServer): Server {
  ioInstance = new Server(server, {
    cors: {
      origin: "*", // Align with production domain configurations
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000, // Handle client connections dropping out gracefully
    pingInterval: 25000,
  });

  ioInstance.on("connection", (socket: Socket) => {
    // Authenticate and attach socket to respective User Identity
    const userId = socket.handshake.query.userId as string;
    
    if (userId && userId !== "undefined") {
      socket.join(userId); // Put user in their private broadcast room
      
      const userSockets = activeConnections.get(userId) || [];
      activeConnections.set(userId, [...userSockets, socket.id]);

      console.log(`🔌 Client Joined Feed Stream: socket.id [${socket.id}] -> userId [${userId}]`);
      
      // Update global online statistics or push user-connected alerts
      ioInstance?.emit("user_status", { userId, status: "online" });
    }

    // Handle incoming direct message text packets
    socket.on("send_direct_message", (payload: { senderId: string; receiverId: string; text: string; messageId: string }) => {
      console.log(`✉️ Sockets routing direct message: From [${payload.senderId}] to [${payload.receiverId}]`);
      
      // Immediately distribute message payload to both user's connection arrays
      ioInstance?.to(payload.receiverId).to(payload.senderId).emit("receive_direct_message", {
        _id: payload.messageId,
        senderId: payload.senderId,
        receiverId: payload.receiverId,
        text: payload.text,
        createdAt: new Date().toISOString(),
      });
    });

    // Handle peer disconnecting cycles
    socket.on("disconnect", () => {
      if (userId && activeConnections.has(userId)) {
        const userSockets = activeConnections.get(userId) || [];
        const updatedSockets = userSockets.filter((sid) => sid !== socket.id);
        
        if (updatedSockets.length > 0) {
          activeConnections.set(userId, updatedSockets);
        } else {
          activeConnections.delete(userId);
          ioInstance?.emit("user_status", { userId, status: "offline" });
        }
        console.log(`🔌 Client left Feed Stream: socket.id [${socket.id}] disconnected.`);
      }
    });
  });

  return ioInstance;
}

/**
 * Accessor method to retrieve singleton SocketIO instance
 */
export function getIO(): Server {
  if (!ioInstance) {
    throw new Error("Cannot reference Socket.io before initialization! Start server first.");
  }
  return ioInstance;
}

/**
 * Broadcast real-time notifications to targeted active sockets instantly.
 */
export function sendNotificationToUser(recipientId: string, notificationPayload: any) {
  try {
    const io = getIO();
    io.to(recipientId).emit("notification_received", notificationPayload);
    console.log(`📢 Dispatched secure live notification payload to recipient: ${recipientId}`);
  } catch (err: any) {
    console.warn("Socket notification skipped (Socket server not initialized or client disconnected):", err.message);
  }
}

/**
 * Broadcast global feed actions to all connected browsers instantly.
 */
export function broadcastFeedAction(actionType: "post_created" | "post_liked" | "post_unliked" | "comment_added" | "story_published", payload: any) {
  try {
    const io = getIO();
    io.emit("feed_dispatch", { action: actionType, data: payload });
    console.log(`🌐 Broadcasted live feed action metrics: [${actionType}] to all clients.`);
  } catch (err: any) {
    console.warn("Global broadcast skipped:", err.message);
  }
}
