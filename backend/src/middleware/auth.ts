import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mathemaniac_secret_key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    phoneNumber: string;
    role: string;
    email?: string;
  };
}

export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, error: 'Forbidden: Invalid or expired token' });
      }

      req.user = decoded as { id: string; phoneNumber: string; role: string; email?: string };
      next();
    });
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
  }
}
