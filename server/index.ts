import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load env from .env.local or .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = (express as any)();
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
      if (!origin) return cb(null, true);
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

// OpenRouter configuration
const OPENROUTER_API_BASE =
  process.env.OPENROUTER_API_BASE?.replace(/\/$/, "") ||
  "https://openrouter.ai/api"; // base without /v1
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "gpt-oss-20b";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5173";

if (!OPENROUTER_API_KEY) {
  console.warn(
    "[server] OPENROUTER_API_KEY is not set. Set it in your environment to enable AI."
  );
}

// OpenRouter proxy route
app.post("/api/openrouter/chat", async (req, res) => {
  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const url = `${OPENROUTER_API_BASE}/v1/chat/completions`;
    const payload = {
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: options?.max_tokens ?? 2000,
      temperature: options?.temperature ?? 0.3,
      top_p: options?.top_p ?? 0.95,
      frequency_penalty: options?.frequency_penalty ?? 0,
      presence_penalty: options?.presence_penalty ?? 0,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": PUBLIC_URL,
        "X-Title": "Skippy AI",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[server] OpenRouter error:", response.status, text);
      return res.status(response.status).send(text);
    }

    res.type("application/json").send(text);
  } catch (err: any) {
    console.error("[server] Proxy error:", err);
    res
      .status(500)
      .json({ error: "proxy_error", message: err?.message || "Unknown error" });
  }
});

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => {
  console.log(
    `[server] OpenRouter proxy running on http://localhost:${PORT} -> ${OPENROUTER_API_BASE}/v1/chat/completions (model: ${OPENROUTER_MODEL})`
  );
});
