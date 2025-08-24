// Secure unlock endpoint with simple IP-based rate limiting
// Environment:
// - UNLOCK_PASSWORD or UNLOCK_PASSWORDS (comma-separated)
// - UNLOCK_MAX_ATTEMPTS (default 5)
// - UNLOCK_LOCKOUT_SECONDS (default 300)

const attempts = new Map(); // ip -> { count, lockoutUntil }

function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"]; // may contain list
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

function normalize(s = "") {
  return String(s).trim();
}

function getAllowedPasswords() {
  const multi = process.env.UNLOCK_PASSWORDS;
  const single = process.env.UNLOCK_PASSWORD;
  const list = [];
  if (multi) list.push(...multi.split(/[,;\n]/).map((s) => normalize(s)).filter(Boolean));
  if (single) list.push(normalize(single));
  return Array.from(new Set(list.filter(Boolean)));
}

import crypto from "node:crypto";

function signSession(payload, secret) {
  const h = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${h}`;
}

function makeCookie(name, value, maxAgeSeconds = 86400) {
  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  // In production on Vercel, use Secure
  if (process.env.VERCEL || process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const ip = getClientIp(req);
  const MAX = Number(process.env.UNLOCK_MAX_ATTEMPTS || 5);
  const LOCK_SECS = Number(process.env.UNLOCK_LOCKOUT_SECONDS || 300);

  const now = Date.now();
  const state = attempts.get(ip) || { count: 0, lockoutUntil: 0 };
  if (state.lockoutUntil && now < state.lockoutUntil) {
    const remaining = Math.ceil((state.lockoutUntil - now) / 1000);
    return res.status(429).json({
      ok: false,
      error: "locked_out",
      retryAfterSeconds: remaining,
    });
  }

  try {
    const { password } = req.body || {};
    const candidate = normalize(password);
    if (!candidate) {
      return res.status(400).json({ ok: false, error: "missing_password" });
    }

    const allowed = getAllowedPasswords();
    if (allowed.length === 0) {
      console.error("[unlock] No UNLOCK_PASSWORD(S) configured");
      return res.status(500).json({ ok: false, error: "server_not_configured" });
    }

    const match = allowed.some((p) => candidate === p);
    if (match) {
      attempts.set(ip, { count: 0, lockoutUntil: 0 });
      const secret = process.env.UNLOCK_SESSION_SECRET;
      const ttl = Number(process.env.UNLOCK_SESSION_TTL || 86400);
      if (secret) {
        const now = Math.floor(Date.now() / 1000);
        const payload = Buffer.from(JSON.stringify({ iat: now, ip })).toString(
          "base64url"
        );
        const token = signSession(payload, secret);
        res.setHeader("Set-Cookie", makeCookie("skippy_session", token, ttl));
      } else {
        console.warn("[unlock] UNLOCK_SESSION_SECRET not set; session cookie skipped");
      }
      return res.status(200).json({ ok: true });
    }

    // Failed attempt
    const nextCount = (state.count || 0) + 1;
    const remaining = Math.max(0, MAX - nextCount);
    const newState = { count: nextCount, lockoutUntil: 0 };
    if (nextCount >= MAX) {
      newState.lockoutUntil = now + LOCK_SECS * 1000;
    }
    attempts.set(ip, newState);

    return res.status(401).json({
      ok: false,
      error: "invalid_password",
      remainingAttempts: remaining,
      lockedOut: Boolean(newState.lockoutUntil && now < newState.lockoutUntil),
      retryAfterSeconds: newState.lockoutUntil
        ? Math.ceil((newState.lockoutUntil - now) / 1000)
        : undefined,
    });
  } catch (err) {
    console.error("[unlock] error:", err);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}
