'use client';
import Script from 'next/script';
export default function RecaptchaScript(){const key=process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;return key?<Script src={`https://www.google.com/recaptcha/api.js?render=${key}`} strategy="afterInteractive"/>:null}
