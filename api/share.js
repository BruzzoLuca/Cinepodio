export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("uid");

  if (!userId) {
    return new Response(JSON.stringify({ error: "Falta uid" }), { status: 400, headers: cors });
  }

  try {
    const [profile, entries] = await Promise.all([
      supabase(`/user_profiles?id=eq.${userId}&limit=1`),
      supabase(`/podio_entries?owner_id=eq.${userId}&order=film_count.desc`),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      profile: profile[0] || null,
      entries,
    }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, ok: false }), { status: 500, headers: cors });
  }
}
