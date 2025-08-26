import crypto from "node:crypto";

function verify(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return false;
  // Optionally check expiry in payload
  try {
    const { iat } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );
    if (!iat) return false;
    const ttl = Number(process.env.UNLOCK_SESSION_TTL || 86400);
    const now = Math.floor(Date.now() / 1000);
    return now - iat < ttl;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false });

  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)skippy_session=([^;]+)/);
  const token = match ? match[1] : "";
  const ok = verify(token, process.env.UNLOCK_SESSION_SECRET || "");
  return res.status(200).json({ ok });
}
