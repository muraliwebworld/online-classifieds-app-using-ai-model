import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';

type TokenPayload = { sub: string; role: 'USER' | 'MODERATOR' | 'ADMIN'; subscriptionTier?: string };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role, subscriptionTier: payload.subscriptionTier };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      req.user = { id: payload.sub, role: payload.role, subscriptionTier: payload.subscriptionTier };
    } catch {
      // Anonymous search is allowed when an optional token is invalid.
    }
  }
  return next();
}

export function canUseAi(user?: { role: string; subscriptionTier?: string }) {
  return user?.role === 'ADMIN' || user?.role === 'MODERATOR' || user?.subscriptionTier === 'PAID';
}
