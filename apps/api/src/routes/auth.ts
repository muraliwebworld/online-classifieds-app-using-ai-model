import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config.js';
import { prisma } from '../db.js';
import rateLimit from 'express-rate-limit';
import { verifyRecaptcha } from '../middleware/recaptcha.js';

export const authRouter = Router();
authRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many authentication attempts. Try again later.' } }));

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1)
});

function signToken(user: { id: string; role: 'USER' | 'MODERATOR' | 'ADMIN'; subscriptionTier: string }) {
  return jwt.sign({ role: user.role, subscriptionTier: user.subscriptionTier }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
  });
}

authRouter.post('/register', verifyRecaptcha, async (req, res, next) => {
  try {
    const registrationSetting = await prisma.themeSetting.findUnique({ where: { key: 'registration_enabled' } });
    if (registrationSetting?.value === false) return res.status(403).json({ error: 'Registration is currently disabled' });
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: { name: input.name, firstName: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true, role: true, subscriptionTier: true, firstName: true, lastName: true, phone: true, avatarUrl: true, address: true, state: true, country: true, postalCode: true }
    });
    return res.status(201).json({ user, accessToken: signToken(user) });
  } catch (error) {
    return next(error);
  }
});

authRouter.post('/login', verifyRecaptcha, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, subscriptionTier: user.subscriptionTier },
      accessToken: signToken(user)
    });
  } catch (error) {
    return next(error);
  }
});
