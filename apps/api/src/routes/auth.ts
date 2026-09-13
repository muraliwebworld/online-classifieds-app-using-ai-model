import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config.js';
import { prisma } from '../db.js';
import rateLimit from 'express-rate-limit';
import { verifyRecaptcha } from '../middleware/recaptcha.js';
import { issueCsrfCookie } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/auth.js';
import { getAuth } from 'firebase-admin/auth';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { valid } from '../lib/totp.js';

export const authRouter = Router();
function firebaseAuth(){ if(!env.FIREBASE_PROJECT_ID||!env.FIREBASE_CLIENT_EMAIL||!env.FIREBASE_PRIVATE_KEY) throw new Error('Firebase is not configured'); const app=getApps()[0]??initializeApp({credential:cert({projectId:env.FIREBASE_PROJECT_ID,clientEmail:env.FIREBASE_CLIENT_EMAIL,privateKey:env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')})}); return getAuth(app); }
authRouter.get('/csrf', (req,res) => res.json({ csrfToken: issueCsrfCookie(res) }));
function setAuthCookie(res: any, token: string) { res.cookie('auth_token', token, { httpOnly: true, secure: env.COOKIE_SECURE || env.NODE_ENV === 'production', sameSite: 'lax', domain: env.COOKIE_DOMAIN, maxAge: 86400000, path: '/' }); }
authRouter.post('/logout', (_req,res) => { res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE || env.NODE_ENV === 'production', domain: env.COOKIE_DOMAIN, path: '/' }); return res.status(204).send(); });
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
function signChallenge(userId:string){return jwt.sign({purpose:'2fa',sub:userId},env.JWT_SECRET,{expiresIn:'5m'})}
async function completeLogin(res:any,user:any){const accessToken=signToken(user);setAuthCookie(res,accessToken);issueCsrfCookie(res);return res.json({user:{id:user.id,name:user.name,email:user.email,role:user.role,subscriptionTier:user.subscriptionTier},accessToken})}

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
    const accessToken=signToken(user); setAuthCookie(res,accessToken); issueCsrfCookie(res); return res.status(201).json({ user, accessToken });
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
    if(user.twoFactorEnabled)return res.json({twoFactorRequired:true,challengeToken:signChallenge(user.id)});
    const accessToken=signToken(user); setAuthCookie(res,accessToken); issueCsrfCookie(res); return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, subscriptionTier: user.subscriptionTier },
      accessToken
    });
  } catch (error) {
    return next(error);
  }
});
authRouter.post('/2fa/verify', async (req,res,next)=>{try{const input=z.object({challengeToken:z.string().min(20),code:z.string().regex(/^\d{6}$/)}).parse(req.body);const payload=jwt.verify(input.challengeToken,env.JWT_SECRET) as {sub:string;purpose:string};if(payload.purpose!=='2fa')return res.status(401).json({error:'Invalid 2FA challenge'});const user=await prisma.user.findUnique({where:{id:payload.sub}});if(!user?.twoFactorEnabled||!user.twoFactorSecret||!valid(user.twoFactorSecret,input.code))return res.status(401).json({error:'Invalid authenticator code'});return completeLogin(res,user)}catch(error){return next(error)}});
authRouter.post('/firebase', verifyRecaptcha, async (req,res,next)=>{try{const input=z.object({idToken:z.string().min(20)}).parse(req.body);const decoded=await firebaseAuth().verifyIdToken(input.idToken);if(!decoded.email)return res.status(400).json({error:'Firebase account has no email'});let user=await prisma.user.findFirst({where:{OR:[{firebaseUid:decoded.uid},{email:decoded.email.toLowerCase()}]}});if(!user){const setting=await prisma.themeSetting.findUnique({where:{key:'registration_enabled'}});if(setting?.value===false)return res.status(403).json({error:'Registration is currently disabled'});user=await prisma.user.create({data:{name:decoded.name??decoded.email.split('@')[0],firstName:decoded.name??null,email:decoded.email.toLowerCase(),passwordHash:bcrypt.hashSync(Math.random().toString(36)+Date.now(),12),firebaseUid:decoded.uid}})}else if(!user.firebaseUid)user=await prisma.user.update({where:{id:user.id},data:{firebaseUid:decoded.uid}});if(user.twoFactorEnabled)return res.json({twoFactorRequired:true,challengeToken:signChallenge(user.id)});return completeLogin(res,user)}catch(error){return next(error)}});
