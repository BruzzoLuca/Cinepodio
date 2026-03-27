import { createClerkClient } from "@clerk/backend";

export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const CLERK_SECRET = process.env.CLERK_SECRET_KEY;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

async function getUserId(req) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const clerk = createClerkClient({ secretKey: CLERK_SECRET });
    const payload = await clerk.verifyToken(token);
    return payload.sub;
  } catch (e) {
    return null;
  }
}

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "resolution=merge-duplicates,return=representation" : "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: cors });
  }

  const { pathname, searchParams } = new URL(req.url);

  // GET /api/podio — get all entries for this user
  if (req.method === "GET") {
    const data = await supabase("GET", `/podio_entries?owner_id=eq.${userId}&order=film_count.desc`);
    return new Response(JSON.stringify(data), { status: 200, headers: cors });
  }

  // POST /api/podio — upsert an entry
  if (req.method === "POST") {
    const body = await req.json();
    const { letterboxd_username, film_count, avatar_url } = body;
    if (!letterboxd_username || film_count === undefined) {
      return new Response(JSON.stringify({ error: "Faltan datos" }), { status: 400, headers: cors });
    }
    const data = await supabase("POST", "/podio_entries", {
      owner_id: userId,
      letterboxd_username: letterboxd_username.toLowerCase(),
      film_count,
      avatar_url: avatar_url || null,
      last_updated: new Date().toISOString(),
    });
    return new Response(JSON.stringify(data[0] || {}), { status: 200, headers: cors });
  }

  // DELETE /api/podio?username=xxx — delete an entry
  if (req.method === "DELETE") {
    const username = searchParams.get("username");
    if (!username) {
      return new Response(JSON.stringify({ error: "Falta username" }), { status: 400, headers: cors });
    }
    await supabase("DELETE", `/podio_entries?owner_id=eq.${userId}&letterboxd_username=eq.${username}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
  }

  return new Response(JSON.stringify({ error: "Método no soportado" }), { status: 405, headers: cors });
}
