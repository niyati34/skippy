import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "node:crypto";

// Load env from .env.local or .env (override to avoid empty system vars shadowing)
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

const app = express();
// CORS: allow dev origins and credentials (cookies)
const allowedOrigins = new Set(
  [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    process.env.PUBLIC_URL || "",
  ].filter(Boolean)
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser or same-origin
      const ok =
        allowedOrigins.has(origin) ||
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
        /^http:\/\/192\.168\.[0-9.]+:\d+$/.test(origin);
      return cb(null, ok);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// OpenRouter chat proxy (only)
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "gpt-oss-20b";
const OPENROUTER_ENDPOINT =
  (process.env.OPENROUTER_API_BASE?.replace(/\/$/, "") ||
    "https://openrouter.ai/api") + "/v1/chat/completions";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5173";

// Safe startup debug (no secrets)
console.log(
  `[server] env check: has OPENROUTER_API_KEY=${Boolean(
    process.env.OPENROUTER_API_KEY
  )}, len=${(process.env.OPENROUTER_API_KEY || "").length}`
);

app.post("/api/openrouter/chat", async (req, res) => {
  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!OPENROUTER_API_KEY) {
      // Safe debug: do not log real key
      console.error(
        "[server] Missing OPENROUTER_API_KEY env; set it in .env.local or environment"
      );
      return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
    }

    const payload = {
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: options?.max_tokens ?? 2000,
      temperature: options?.temperature ?? 0.3,
      top_p: options?.top_p ?? 0.95,
      frequency_penalty: options?.frequency_penalty ?? 0,
      presence_penalty: options?.presence_penalty ?? 0,
    };

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": PUBLIC_URL,
        "X-Title": "Skippy-Local",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[server] OpenRouter error:", response.status, text);
      return res.status(response.status).send(text);
    }

    res.type("application/json").send(text);
  } catch (err) {
    console.error("[server] OpenRouter proxy error:", err);
    res
      .status(500)
      .json({ error: "proxy_error", message: err?.message || "Unknown error" });
  }
});

// Simple in-memory unlock for local dev (parity with serverless)
const attempts = new Map();
app.post("/api/unlock", (req, res) => {
  const getIp = () =>
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip;
  const ip = getIp();
  const MAX = Number(process.env.UNLOCK_MAX_ATTEMPTS || 5);
  const LOCK_SECS = Number(process.env.UNLOCK_LOCKOUT_SECONDS || 300);
  const allowed = [
    ...(process.env.UNLOCK_PASSWORDS || "")
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  ];
  if (process.env.UNLOCK_PASSWORD)
    allowed.push(process.env.UNLOCK_PASSWORD.trim());
  if (allowed.length === 0) {
    return res.status(500).json({ ok: false, error: "server_not_configured" });
  }

  const now = Date.now();
  const state = attempts.get(ip) || { count: 0, lockoutUntil: 0 };
  if (state.lockoutUntil && now < state.lockoutUntil) {
    const remaining = Math.ceil((state.lockoutUntil - now) / 1000);
    return res
      .status(429)
      .json({ ok: false, error: "locked_out", retryAfterSeconds: remaining });
  }

  const candidate = String(req.body?.password || "").trim();
  if (!candidate)
    return res.status(400).json({ ok: false, error: "missing_password" });
  const match = allowed.some((p) => p === candidate);
  if (match) {
    attempts.set(ip, { count: 0, lockoutUntil: 0 });
    // Issue a signed session cookie if secret configured
    const secret = process.env.UNLOCK_SESSION_SECRET || "";
    const ttl = Number(process.env.UNLOCK_SESSION_TTL || 86400);
    if (secret) {
      try {
        const now = Math.floor(Date.now() / 1000);
        const payload = Buffer.from(JSON.stringify({ iat: now, ip })).toString(
          "base64url"
        );
        const sig = crypto
          .createHmac("sha256", secret)
          .update(payload)
          .digest("base64url");
        const token = `${payload}.${sig}`;
        const cookieParts = [
          `skippy_session=${token}`,
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          `Max-Age=${ttl}`,
        ];
        if (process.env.VERCEL || process.env.NODE_ENV === "production") {
          cookieParts.push("Secure");
        }
        res.setHeader("Set-Cookie", cookieParts.join("; "));
      } catch (e) {
        console.warn("[unlock] failed to set session cookie:", e);
      }
    }
    return res.json({ ok: true });
  }
  const next = (state.count || 0) + 1;
  const newState = { count: next, lockoutUntil: 0 };
  if (next >= MAX) newState.lockoutUntil = now + LOCK_SECS * 1000;
  attempts.set(ip, newState);
  return res.status(401).json({
    ok: false,
    error: "invalid_password",
    remainingAttempts: Math.max(0, MAX - next),
    lockedOut: Boolean(newState.lockoutUntil && now < newState.lockoutUntil),
    retryAfterSeconds: newState.lockoutUntil
      ? Math.ceil((newState.lockoutUntil - now) / 1000)
      : undefined,
  });
});

// Verify session (local dev)
app.get("/api/unlock/verify", (req, res) => {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)skippy_session=([^;]+)/);
  const token = match ? match[1] : "";
  const secret = process.env.UNLOCK_SESSION_SECRET || "";
  const ok = (() => {
    try {
      if (!token || !secret) return false;
      const [payload, sig] = token.split(".");
      if (!payload || !sig) return false;
      const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
        return false;
      const { iat } = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8")
      );
      const ttl = Number(process.env.UNLOCK_SESSION_TTL || 86400);
      const now = Math.floor(Date.now() / 1000);
      return now - iat < ttl;
    } catch {
      return false;
    }
  })();
  res.json({ ok });
});

// Logout (local dev)
app.post("/api/unlock/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "skippy_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  );
  res.json({ ok: true });
});

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => {
  console.log(
    `[server] OpenRouter proxy running on http://localhost:${PORT} -> ${OPENROUTER_ENDPOINT} (model: ${OPENROUTER_MODEL})`
  );
});
