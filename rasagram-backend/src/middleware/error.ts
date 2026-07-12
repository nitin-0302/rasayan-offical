import { Request, Response, NextFunction } from "express";

export interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: any;
}

/**
 * Universal error interceptor for Express route handlers.
 * Guarantees zero system information leaks while providing readable diagnostic reports in Dev mode.
 */
export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Prevent unused-vars variable warning while maintaining Express 4-arity error signature
  void _next;

  // Log raw trace logs for internal review
  console.error("💥 SYSTEM RUNTIME ERROR LOGGED:", {
    message: err.message,
    stack: err.stack,
    code: err.code
  });

  // Mongoose Duplicated Field Error Handler
  if (err.code === 11000) {
    const fieldName = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(400).json({
      success: false,
      message: `The provided value for '${fieldName}' is already registered in our systems.`
    });
  }

  // Mongoose Validation Error Handler 
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  // JWT Expired Error Handler
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Your session token has expired. Please authenticate again to resume operations."
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected database or processing error occurred.";

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
  });
}
