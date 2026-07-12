import express from "express";
import { createServer } from "http";
import cors from "cors";
import dotenv from "dotenv";

import { connectDB } from "./config/db.js";
import { initSocketServer } from "./services/socketService.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";

// Load Environment variables securely
dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;

// Connect to MongoDB using fine-tuned pooling configurations
connectDB();

// Setup Real-time Sockets using HTTP wrapper instance
initSocketServer(httpServer);

// Global Security & Parsers Middlwares
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" })); // Mitigates oversized JSON body attacks
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Server Diagnostics Check Endpoints
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Load Modular API Router Configurations
app.use("/api/v1", apiRoutes);

// Catch-all Fallback Endpoint (404 Page)
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Invalid access path. ${req.originalUrl} does not match any registered endpoints.`
  });
});

// Centralized Catch-All Error Filtering Middleware
app.use(errorHandler);

// Standalone Production-Ready Boot Sequences
httpServer.listen(PORT, () => {
  console.log(`
  ======================================================
  🚀 RASAGRAM BACKEND ENGINE FULLY FUNCTIONAL
  📡 Server instance is actively listening on Port: ${PORT}
  🛠️ Production environment: ${process.env.NODE_ENV || "development"}
  ======================================================
  `);
});
