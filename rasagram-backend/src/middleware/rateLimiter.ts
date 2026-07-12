import rateLimit from "express-rate-limit";

// Primary API Limiter - mitigates simple bot scripts and DDoS vectors
export const primaryApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 300, // Limit each IP address to 300 requests per window
  standardHeaders: true, // Return standard IP limit headers
  legacyHeaders: false, // Turn off X-RateLimit headers
  message: {
    success: false,
    message: "Rate limit reached. Too many requests have been made from this IP. Please try again after 15 minutes.",
  },
});

// High-Security Auth Attempt Limiter - stops credential stuffing/brute force
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 15, // Limit IPs to 15 authentication tries hourly
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts made. Please wait one hour before claiming credentials again.",
  },
});
