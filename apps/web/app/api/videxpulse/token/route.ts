import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = String(process.env.VIDEXPULSE_URL || '').trim().replace(/\/+$/, '');
  const appId = String(process.env.VIDEXPULSE_APP_ID || '').trim();
  const apiKey = String(process.env.VIDEXPULSE_API_KEY || '').trim();
  const secretKey = String(process.env.VIDEXPULSE_SECRET_KEY || '').trim();

  if (!baseUrl || !appId || !apiKey || !secretKey) {
    return NextResponse.json({ configured: false }, { status: 200 });
  }

  try {
    const res = await fetch(`${baseUrl}/api/apps/${encodeURIComponent(appId)}/sdk-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-videxpulse-api-key': apiKey,
        'x-videxpulse-secret-key': secretKey
      },
      body: JSON.stringify({ platform: 'web', capabilities: ['register'] }),
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to mint Videxpulse token' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({
      configured: true,
      baseUrl,
      appId,
      publishToken: data.publishToken || data.token || ''
    });
  } catch {
    return NextResponse.json({ error: 'Videxpulse unreachable' }, { status: 502 });
  }
}
