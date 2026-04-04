/**
 * Vercel Edge Function — Play Integrity token verification
 * POST /api/verify-integrity  { token: "<integrity_token>" }
 *
 * Required Vercel environment variables:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — Firebase service account email
 *                                   (firebase-adminsdk-fbsvc@eggbeater-wp.iam.gserviceaccount.com)
 *   GOOGLE_SERVICE_ACCOUNT_KEY    — Service account private key (full PEM, \n as literal \n)
 *
 * The service account must have the "Service Account Token Creator" role AND
 * the Play Integrity API must be enabled in your Google Cloud project:
 *   https://console.cloud.google.com/apis/library/playintegrity.googleapis.com
 *
 * Returns the full TokenPayloadExternal from Google, e.g.:
 * {
 *   requestDetails: { requestPackageName, timestampMillis, nonce },
 *   appIntegrity:   { appRecognitionVerdict, packageName, certificateSha256Digest, versionCode },
 *   deviceIntegrity:{ deviceRecognitionVerdict },
 *   accountDetails: { appLicensingVerdict }
 * }
 */

export const config = { runtime: 'edge' };

const PACKAGE_NAME = 'com.eggbeater.waterpolo';
const PLAY_INTEGRITY_URL = `https://playintegrity.googleapis.com/v1/${PACKAGE_NAME}:decodeIntegrityToken`;
const GOOGLE_TOKEN_URL   = 'https://oauth2.googleapis.com/token';
const SCOPE              = 'https://www.googleapis.com/auth/playintegrity';

export default async function handler(req) {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body;
  try { body = await req.json(); } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { token } = body;
  if (!token || typeof token !== 'string') {
    return json({ error: 'token is required' }, 400);
  }

  // ── Get Google OAuth2 access token ─────────────────────────────────────────
  let accessToken;
  try {
    accessToken = await getGoogleAccessToken();
  } catch (e) {
    console.error('Google auth error:', e);
    return json({ error: 'Failed to authenticate with Google' }, 502);
  }

  // ── Verify integrity token with Play Integrity API ─────────────────────────
  let verdict;
  try {
    const res = await fetch(PLAY_INTEGRITY_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ integrity_token: token }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Play Integrity API error:', res.status, errText);
      return json({ error: 'Integrity verification failed', status: res.status }, 502);
    }

    verdict = await res.json();
  } catch (e) {
    console.error('Play Integrity fetch error:', e);
    return json({ error: 'Network error contacting Play Integrity API' }, 502);
  }

  return json(verdict, 200);
}

// ── Google Service Account → OAuth2 access token ────────────────────────────
// Uses the Web Crypto API (available in Vercel Edge runtime) to sign a JWT
// with the service account's RSA private key.

async function getGoogleAccessToken() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const pemKey     = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n');

  if (!email || !pemKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY not set');
  }

  const now = Math.floor(Date.now() / 1000);

  const headerB64  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payloadB64 = b64url(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud:  GOOGLE_TOKEN_URL,
    iat:  now,
    exp:  now + 3600,
  }));

  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the RSA private key
  const keyData = pemToArrayBuffer(pemKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const jwt = `${signingInput}.${arrayBufferToB64url(signature)}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} ${t}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function b64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayBufferToB64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary  = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view   = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buffer;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  'https://eggbeater.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
