import nodemailer from 'nodemailer';
import { env } from '../config.js';

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_FROM);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
}): Promise<void> {
  if (!isSmtpConfigured()) return;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: params.to,
    subject: 'Reset your password',
    text: [
      `Hi ${params.name},`,
      '',
      'We received a request to reset your password. Open the link below to set a new password (valid for 15 minutes):',
      params.resetUrl,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `<p>Hi ${escapeHtml(params.name)},</p><p>We received a request to reset your password. Click the link below to set a new password (valid for 15 minutes):</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
}
