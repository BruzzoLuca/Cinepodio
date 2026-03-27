export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const CLERK_PEM   = process.env.CLERK_PEM_PUBLIC_KEY;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// --- JWT verification using Web Crypto (Edge-compatible) ---
function base64urlToBuffer(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function pemToBuffer(pem) {
  const lines = pem.split('\n').filter(l => !l.startsWith('-----'));
  return base64urlToBuffer(lines.join(''));
}

async function verifyJWT(token) {
  const [headerB64, payloadB64, sigB64] = token.split('.');
  if (!headerB64 || !payloadB64 || !sigB64) throw new Error('Invalid token');

  const keyBuffer = pemToBuffer(CLERK_PEM);
  const cryptoKey = await crypto.subtle.importKey(
    'spki', keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['verify']
  );

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig  = base64urlToBuffer(sigB64);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);
  if (!valid) throw new Error('Invalid signature');

  const payload = JSON.parse(atob(payloadB64.replace(/-/g,'+').replace(/_/g,'/')));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

async function getUserId(req) {
  const auth  = req.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const payload = await verifyJWT(token);
    return payload.sub;
  } catch (e) {
    return null;
  }
}

// --- Supabase REST helper ---
async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST'
        ? 'resolution=merge-duplicates,return=representation'
        : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Supabase error: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// --- Handler ---
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const userId = await getUserId(req);
  if (!userId) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: cors });

  const { searchParams } = new URL(req.url);

  if (req.method === 'GET') {
    const data = await supabase('GET', `/podio_entries?owner_id=eq.${userId}&order=film_count.desc`);
    return new Response(JSON.stringify(data), { status: 200, headers: cors });
  }

  if (req.method === 'POST') {
    const { letterboxd_username, film_count, avatar_url } = await req.json();
    if (!letterboxd_username || film_count === undefined)
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400, headers: cors });
    const data = await supabase('POST', '/podio_entries', {
      owner_id: userId,
      letterboxd_username: letterboxd_username.toLowerCase(),
      film_count,
      avatar_url: avatar_url || null,
      last_updated: new Date().toISOString(),
    });
    return new Response(JSON.stringify(data[0] || {}), { status: 200, headers: cors });
  }

  if (req.method === 'DELETE') {
    const username = searchParams.get('username');
    if (!username) return new Response(JSON.stringify({ error: 'Falta username' }), { status: 400, headers: cors });
    await supabase('DELETE', `/podio_entries?owner_id=eq.${userId}&letterboxd_username=eq.${username}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }

  return new Response(JSON.stringify({ error: 'Método no soportado' }), { status: 405, headers: cors });
}
