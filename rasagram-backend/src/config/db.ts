import mongoose from "mongoose";

/**
 * Initializes connection to MongoDB.
 * Utilizes recommended connection settings for high durability and performance.
 */
export async function connectDB() {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error("CRITICAL ERROR: MONGO_URI environment variable is missing!");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 100, // Handle up to 100 parallel sockets per instance (scales beautifully for 100,000+ users)
      minPoolSize: 10,  // Keep a warm pool ready
      socketTimeoutMS: 45000, // Fail-fast on stale sockets
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`📡 MongoDB Connected Successfully: ${conn.connection.host}`);
    
    // Listen for disconnections and attempt self-healing reconnection
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB connection lost! Retrying connection...");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

  } catch (error) {
    console.error("❌ Failed to establish initial database connection:", error);
    process.exit(1);
  }
}
