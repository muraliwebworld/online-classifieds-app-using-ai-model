import crypto from 'node:crypto';
import type { RequestHandler } from 'express';
const unsafe = new Set(['POST','PUT','PATCH','DELETE']);
export function issueCsrfCookie(res: any) { const token=crypto.randomBytes(32).toString('hex'); res.cookie('csrf_token',token,{httpOnly:false,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:86400000}); return token; }
export const csrfProtection: RequestHandler = (req,res,next) => { if(!unsafe.has(req.method)||req.path.startsWith('/auth/'))return next(); if(!req.cookies?.auth_token)return next(); const expected=req.cookies.csrf_token; const supplied=req.header('x-csrf-token'); if(!expected||!supplied||expected!==supplied)return res.status(403).json({error:'CSRF validation failed'}); return next(); };
