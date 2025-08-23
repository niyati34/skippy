import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load env from .env.local or .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Azure config (legacy/fallback)
const API_BASE =
  process.env.VITE_OPENAI_API_BASE || process.env.OPENAI_API_BASE || "";
const API_KEY =
  process.env.VITE_AZURE_OPENAI_KEY || process.env.AZURE_OPENAI_API_KEY || "";
const API_VERSION =
  process.env.VITE_AZURE_OPENAI_API_VERSION ||
  process.env.AZURE_OPENAI_API_VERSION ||
  "2025-01-01-preview";
const DEPLOYMENT =
  process.env.VITE_AZURE_OPENAI_DEPLOYMENT ||
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME ||
  "gpt-4o";

// OpenRouter config (preferred)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "gpt-oss-20b";
const OPENROUTER_ENDPOINT =
  process.env.OPENROUTER_API_BASE ||
  "https://openrouter.ai/api/v1/chat/completions";

if (!OPENROUTER_API_KEY) {
  console.warn(
    "[server] OPENROUTER_API_KEY missing. OpenRouter route will return 500 until configured."
  );
}
if (!API_BASE || !API_KEY) {
  console.warn(
    "[server] Azure OpenAI env vars missing. Azure route will return 500 until configured."
  );
}

app.post("/api/azure-openai/chat", async (req, res) => {
  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const url = `${API_BASE.replace(
      /\/$/,
      ""
    )}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

    const payload = {
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
        "api-key": API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[server] Azure error:", response.status, text);
      return res.status(response.status).send(text);
    }

    res.type("application/json").send(text);
  } catch (err) {
    console.error("[server] Proxy error:", err);
    res
      .status(500)
      .json({ error: "proxy_error", message: err?.message || "Unknown error" });
  }
});

// OpenRouter chat proxy
app.post("/api/openrouter/chat", async (req, res) => {
  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    if (!OPENROUTER_API_KEY) {
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
        "HTTP-Referer": process.env.PUBLIC_URL || "http://localhost:5173",
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

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => {
  console.log(
    `[server] Proxies running on http://localhost:${PORT} -> /api/openrouter/chat and /api/azure-openai/chat`
  );
});
