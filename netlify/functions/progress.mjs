import { getStore } from "@netlify/blobs";

// Per-user progress storage.
//   GET /api/progress?user=<name>  -> stored JSON ({} if none)
//   PUT /api/progress?user=<name>  -> save JSON body
// Names are case-insensitive; no password by design (see site notice).

const MAX_BODY_BYTES = 100_000;
const NAME_RE = /^[a-z0-9 _.-]{2,40}$/;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const url = new URL(req.url);
  const raw = (url.searchParams.get("user") || "").trim().toLowerCase();

  if (!NAME_RE.test(raw)) {
    return json(400, { error: "invalid user name (2-40 letters/numbers/spaces)" });
  }
  const key = raw.replace(/\s+/g, "-");
  const store = getStore("progress");

  if (req.method === "GET") {
    const data = await store.get(key, { type: "json" });
    return json(200, data || {});
  }

  if (req.method === "PUT" || req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json(413, { error: "payload too large" });
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json(400, { error: "body must be JSON" });
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return json(400, { error: "body must be a JSON object" });
    }
    data.updatedAt = new Date().toISOString();
    await store.setJSON(key, data);
    return json(200, { ok: true, updatedAt: data.updatedAt });
  }

  return json(405, { error: "method not allowed" });
};

export const config = { path: "/api/progress" };
