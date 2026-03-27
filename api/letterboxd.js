import { parse } from "node-html-parser";

export const config = { runtime: "edge" };

async function fetchPage(username, year, page = 1) {
  const url = `https://letterboxd.com/${username}/films/diary/for/${year}/page/${page}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

async function getFilmCount(username, year) {
  const html = await fetchPage(username, year, 1);
  const root = parse(html);

  // Check if user exists
  const notFound = root.querySelector(".error-404");
  if (notFound) throw new Error("USER_NOT_FOUND");

  // Check if profile is private
  const locked = root.querySelector(".profile-locked");
  if (locked) throw new Error("PRIVATE_PROFILE");

  // Try to get total from pagination header e.g. "1–25 of 143"
  const paginationText =
    root.querySelector(".paginate-pages")?.text ||
    root.querySelector("[data-total]")?.getAttribute("data-total") ||
    "";

  const ofMatch = paginationText.match(/of\s+([\d,]+)/i);
  if (ofMatch) {
    return parseInt(ofMatch[1].replace(/,/g, ""));
  }

  // Count entries on page 1 and check for more pages
  const entries = root.querySelectorAll("tr.diary-entry-row");
  const entriesPage1 = entries.length;

  if (entriesPage1 === 0) return 0;

  // Find last page number
  const lastPageLink = root.querySelector(".paginate-pages a:last-child");
  const lastPageHref = lastPageLink?.getAttribute("href") || "";
  const lastPageMatch = lastPageHref.match(/page\/(\d+)/);

  if (!lastPageMatch) {
    // Only one page
    return entriesPage1;
  }

  const lastPage = parseInt(lastPageMatch[1]);

  // Fetch last page to count remaining entries
  const lastHtml = await fetchPage(username, year, lastPage);
  const lastRoot = parse(lastHtml);
  const lastEntries = lastRoot.querySelectorAll("tr.diary-entry-row").length;

  return (lastPage - 1) * entriesPage1 + lastEntries;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.toLowerCase().trim();
  const year = parseInt(searchParams.get("year")) || new Date().getFullYear();

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (!username || !/^[a-z0-9_-]+$/.test(username)) {
    return new Response(
      JSON.stringify({ error: "Nombre de usuario inválido" }),
      { status: 400, headers: cors }
    );
  }

  try {
    const count = await getFilmCount(username, year);
    return new Response(JSON.stringify({ username, year, count, ok: true }), {
      status: 200,
      headers: cors,
    });
  } catch (e) {
    const msg =
      e.message === "USER_NOT_FOUND"
        ? "Usuario no encontrado en Letterboxd"
        : e.message === "PRIVATE_PROFILE"
        ? "El perfil de este usuario es privado"
        : "No se pudo obtener los datos. Intentá de nuevo.";

    return new Response(JSON.stringify({ error: msg, ok: false }), {
      status: e.message === "USER_NOT_FOUND" ? 404 : 500,
      headers: cors,
    });
  }
}
