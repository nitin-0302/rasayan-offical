import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
}

/**
 * Access protection token verification middleware.
 */
export function protect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Retrieve token from Authorization header or Cookies
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access Denied: Missing authentication token Bearer." 
    });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "fallback_default_secret_rasagram";
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      username: string;
    };

    // Attach authenticated details into request stream
    req.user = decoded;
    next();
  } catch (err: any) {
    console.warn("JWT Verification Failed: ", err.message);
    return res.status(401).json({ 
      success: false, 
      message: "Access Unauthorized: Expired or corrupted token payload." 
    });
  }
}
