import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

export const profileRouter = Router();
const profileSchema = z.object({ firstName: z.string().trim().max(80).optional(), lastName: z.string().trim().max(80).optional(), phone: z.string().trim().max(30).optional(), avatarUrl: z.url().or(z.literal('')).optional(), address: z.string().trim().max(250).optional(), state: z.string().trim().max(100).optional(), country: z.string().trim().max(100).optional(), postalCode: z.string().trim().max(20).optional() });

profileRouter.get('/', requireAuth, async (req, res, next) => { try { const profile=await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, name: true, email: true, role: true, subscriptionTier: true, firstName: true, lastName: true, phone: true, avatarUrl: true, address: true, state: true, country: true, postalCode: true, twoFactorEnabled: true, twoFactorReminderDismissedAt: true } }); return res.json({ profile }); } catch (error) { return next(error); } });
profileRouter.patch('/', requireAuth, async (req, res, next) => { try { const input = profileSchema.parse(req.body); const user = await prisma.user.update({ where: { id: req.user!.id }, data: { ...input, name: [input.firstName, input.lastName].filter(Boolean).join(' ') || undefined }, select: { id: true, name: true, email: true, role: true, subscriptionTier: true, firstName: true, lastName: true, phone: true, avatarUrl: true, address: true, state: true, country: true, postalCode: true } }); return res.json({ profile: user }); } catch (error) { return next(error); } });
profileRouter.delete('/', requireAuth, async (req, res, next) => { try { await prisma.user.delete({ where: { id: req.user!.id } }); return res.status(204).send(); } catch (error) { return next(error); } });
