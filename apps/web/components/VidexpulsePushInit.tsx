'use client';

import { useEffect } from 'react';
import { mountVidexpulsePrompt } from '@videxpulse/web-sdk';

export default function VidexpulsePushInit() {
  useEffect(() => {
    mountVidexpulsePrompt({ tokenEndpoint: '/api/videxpulse/token' });
  }, []);

  return null;
}
