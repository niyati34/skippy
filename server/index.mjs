import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "node:crypto";

// Load env from .env.local or .env (override to avoid empty system vars shadowing)
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

const app = express();
// Allow frontend to send/receive cookies via proxy or direct
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// OpenRouter chat proxy (only)
const OPENROUTER_MODEL = (process.env.OPENROUTER_MODEL || "gpt-oss-20b").trim();
const OPENROUTER_ENDPOINT =
  (process.env.OPENROUTER_API_BASE?.replace(/\/$/, "") ||
    "https://openrouter.ai/api") + "/v1/chat/completions";
const PUBLIC_URL = (process.env.PUBLIC_URL || "http://localhost:5173").trim();
const OPENROUTER_REFERER = (process.env.OPENROUTER_REFERER || "").trim();
const MOCK_FLAG = (process.env.OPENROUTER_MOCK || "").trim().toLowerCase();
const ALLOW_CLIENT_MODEL = ["1", "true", "yes"].includes(
  String(process.env.OPENROUTER_ALLOW_CLIENT_MODEL || "")
    .trim()
    .toLowerCase()
);

// Safe startup debug (no secrets)
console.log(
  `[server] env check: has OPENROUTER_API_KEY=${Boolean(
    process.env.OPENROUTER_API_KEY
  )}, len=${(process.env.OPENROUTER_API_KEY || "").length}`
);
console.log(
  `[server] config: model=${OPENROUTER_MODEL}, mock_flag=${MOCK_FLAG}, public_url=${PUBLIC_URL}`
);

// Quick env debug endpoint (no secrets)
app.get("/api/debug/env", (_req, res) => {
  res.json({
    model: OPENROUTER_MODEL,
    mock: MOCK_FLAG,
    publicUrl: PUBLIC_URL,
  });
});

// Simple root page so hitting the server base URL doesn't 404
app.get("/", (_req, res) => {
  res.type("text/html").send(
    `<!doctype html><html><head><meta charset="utf-8"/><title>Skippy API</title></head><body style="font-family:system-ui;padding:20px">
        <h1>Skippy Local API</h1>
        <p>Status: running</p>
        <ul>
          <li><a href="/api/openrouter/check">/api/openrouter/check</a> - list models (verifies API key)</li>
          <li><a href="/api/debug/env">/api/debug/env</a> - debug env (safe)</li>
          <li><a href="/healthz">/healthz</a> - health</li>
        </ul>
      </body></html>`
  );
});

// Lightweight health endpoint
app.get("/healthz", (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    model: OPENROUTER_MODEL,
    mock: MOCK_FLAG,
    publicUrl: PUBLIC_URL,
  });
});

app.post("/api/openrouter/chat", async (req, res) => {
  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Dev short-circuit: only mock immediately when explicitly requested
    // Set OPENROUTER_MOCK=always to force early mocks; use OPENROUTER_MOCK=1 for error-only fallback mocks
    if (MOCK_FLAG === "always") {
      const lastUser = messages
        .slice()
        .reverse()
        .find((m) => m.role === "user")?.content;
      const mock = {
        id: "mock-early",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: OPENROUTER_MODEL,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content:
                lastUser?.length > 0
                  ? `Mock reply: ${lastUser.slice(0, 200)}`
                  : "Mock reply: Hello!",
            },
            finish_reason: "stop",
          },
        ],
      };
      return res.type("application/json").send(JSON.stringify(mock));
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

    // Allow client-provided model override only if enabled via env
    if (
      ALLOW_CLIENT_MODEL &&
      options?.model &&
      typeof options.model === "string" &&
      options.model.trim()
    ) {
      payload.model = options.model.trim();
    }

    // Derive origin or use configured referer
    const refHdr = req.get("referer") || "";
    const origHdr = req.get("origin") || "";
    let derivedOrigin = origHdr;
    if (!derivedOrigin && refHdr) {
      try {
        derivedOrigin = new URL(refHdr).origin;
      } catch {}
    }
    const ORIGIN = (OPENROUTER_REFERER || derivedOrigin || PUBLIC_URL).trim();

    console.log("[server] OpenRouter request", {
      model: payload.model,
      origin: ORIGIN,
      mock: MOCK_FLAG,
    });

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        // Minimal headers per OpenRouter docs and your working example
        "HTTP-Referer": ORIGIN || "https://openrouter.ai/",
        "X-Title": "Skippy-Local",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[server] OpenRouter error:", response.status, text);
      const mockEnabled = ["1", "true", "yes", "always"].includes(MOCK_FLAG);
      const isAuthErr = response.status === 401 || response.status === 403;
      if (mockEnabled && (isAuthErr || !OPENROUTER_API_KEY)) {
        // Minimal mock response to keep UI working locally
        const lastUser = Array.isArray(messages)
          ? messages
              .slice()
              .reverse()
              .find((m) => m.role === "user")?.content || ""
          : "";
        const mock = {
          id: "mock-1",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: OPENROUTER_MODEL,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content:
                  lastUser?.length > 0
                    ? `Mock reply: ${lastUser.slice(0, 200)}`
                    : "Mock reply: Hello!",
              },
              finish_reason: "stop",
            },
          ],
        };
        return res.type("application/json").send(JSON.stringify(mock));
      }
      return res.status(response.status).send(text);
    }

    res.type("application/json").send(text);
  } catch (err) {
    console.error("[server] OpenRouter proxy error:", err);
    return res
      .status(500)
      .json({ error: "proxy_error", message: err?.message || "Unknown error" });
  }
});

// Diagnostics: verify OpenRouter key works (list models)
app.get("/api/openrouter/check", async (req, res) => {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
    }
    const refHdr = req.get("referer") || "";
    const origHdr = req.get("origin") || "";
    let derivedOrigin = origHdr;
    if (!derivedOrigin && refHdr) {
      try {
        derivedOrigin = new URL(refHdr).origin;
      } catch {}
    }
    const ORIGIN = (OPENROUTER_REFERER || derivedOrigin || PUBLIC_URL).trim();
    const endpoint =
      (process.env.OPENROUTER_API_BASE?.replace(/\/$/, "") ||
        "https://openrouter.ai/api") + "/v1/models";
    const r = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": ORIGIN || "https://openrouter.ai/",
        "X-Title": "Skippy-Local",
      },
    });
    const text = await r.text();
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    res
      .status(500)
      .json({ error: "check_failed", message: err?.message || "unknown" });
  }
});

// Hardcoded test endpoint for chat
app.get("/api/openrouter/test-chat", async (req, res) => {
  try {
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: "OPENROUTER_API_KEY missing" });
    }

    const refHdr = req.get("referer") || "";
    const origHdr = req.get("origin") || "";
    let derivedOrigin = origHdr;
    if (!derivedOrigin && refHdr) {
      try {
        derivedOrigin = new URL(refHdr).origin;
      } catch {}
    }
    const ORIGIN = (OPENROUTER_REFERER || derivedOrigin || PUBLIC_URL).trim();

    const hardcodedPayload = {
      model: "mistralai/mistral-7b-instruct-v0.1",
      messages: [{ role: "user", content: "Hello, this is a test." }],
    };

    const endpoint =
      (process.env.OPENROUTER_API_BASE?.replace(/\/$/, "") ||
        "https://openrouter.ai/api") + "/v1/chat/completions";

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": ORIGIN || "https://openrouter.ai/",
        "X-Title": "Skippy-Test-Chat",
      },
      body: JSON.stringify(hardcodedPayload),
    });

    const text = await r.text();
    console.log(
      `[server] /test-chat result: status=${r.status}, text=${text.slice(
        0,
        100
      )}...`
    );
    res.status(r.status).type("application/json").send(text);
  } catch (err) {
    console.error("[server] /test-chat error:", err);
    res
      .status(500)
      .json({ error: "test_chat_failed", message: err?.message || "unknown" });
  }
});

// Simple in-memory unlock for local dev (parity with serverless)
const attempts = new Map();
function makeCookie(name, value, maxAgeSeconds = 86400) {
  const parts = [
    `${name}=${value}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    `Max-Age=${maxAgeSeconds}`,
  ];
  // Not setting Secure for localhost; can add in prod reverse proxy
  return parts.join("; ");
}

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
    // Set signed session cookie if secret configured (parity with serverless fn)
    const secret = process.env.UNLOCK_SESSION_SECRET || "";
    const ttl = Number(process.env.UNLOCK_SESSION_TTL || 86400);
    if (secret) {
      const now = Math.floor(Date.now() / 1000);
      const payload = Buffer.from(JSON.stringify({ iat: now, ip })).toString(
        "base64url"
      );
      const h = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");
      const token = `${payload}.${h}`;
      res.setHeader("Set-Cookie", makeCookie("skippy_session", token, ttl));
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
