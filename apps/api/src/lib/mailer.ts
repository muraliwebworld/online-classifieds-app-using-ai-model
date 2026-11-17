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
  if (!isSmtpConfigured()) {
    console.warn('[mailer] SMTP not configured', {
      hasHost: Boolean(env.SMTP_HOST),
      hasFrom: Boolean(env.SMTP_FROM),
    });
    return;
  }

  console.info('[mailer] sending password reset email', {
    to: params.to,
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    hasUser: Boolean(env.SMTP_USER),
    hasPass: Boolean(env.SMTP_PASS),
    from: env.SMTP_FROM,
  });

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });

  const info = await transporter.sendMail({
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

  console.info('[mailer] email sent', {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });
}
