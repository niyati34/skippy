import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load env from .env.local or .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// OpenRouter chat proxy (only)
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "gpt-oss-20b";
const OPENROUTER_ENDPOINT =
  (process.env.OPENROUTER_API_BASE?.replace(/\/$/, "") ||
    "https://openrouter.ai/api") + "/v1/chat/completions";
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:5173";

app.post("/api/openrouter/chat", async (req, res) => {
  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
    if (!OPENROUTER_API_KEY) {
      // Safe debug: do not log real key
      console.error("[server] Missing OPENROUTER_API_KEY env; set it in .env.local or environment");
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

const PORT = Number(process.env.PORT || 5174);
app.listen(PORT, () => {
  console.log(
    `[server] OpenRouter proxy running on http://localhost:${PORT} -> ${OPENROUTER_ENDPOINT} (model: ${OPENROUTER_MODEL})`
  );
});
