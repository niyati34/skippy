// Vercel serverless function for OpenRouter proxy
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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    const MODEL = process.env.OPENROUTER_MODEL || "gpt-oss-20b";
    const ENDPOINT =
      process.env.OPENROUTER_API_BASE ||
      "https://openrouter.ai/api/v1/chat/completions";

    if (!API_KEY) {
      console.error("[vercel] Missing OPENROUTER_API_KEY");
      return res.status(500).json({
        error: "Configuration error",
        message: "OPENROUTER_API_KEY not configured",
      });
    }

    const payload = {
      model: MODEL,
      messages,
      max_tokens: options?.max_tokens ?? 2000,
      temperature: options?.temperature ?? 0.3,
      top_p: options?.top_p ?? 0.95,
      frequency_penalty: options?.frequency_penalty ?? 0,
      presence_penalty: options?.presence_penalty ?? 0,
    };

    // Prefer the request origin; fallback to Vercel URL if available
    const siteUrl =
      req.headers?.origin ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
      "https://skippy-kohl.vercel.app";

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      // Optional but recommended by OpenRouter
      "HTTP-Referer": siteUrl,
      "X-Title": "Skippy",
    };

    console.log("[vercel] OpenRouter request -> model:", MODEL, "referer:", siteUrl);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error("[vercel] OpenRouter error:", response.status, text);
      return res
        .status(response.status)
        .json({ error: "openrouter_error", message: text });
    }

    // Pass through JSON
    res.status(200).type("application/json").send(text);
  } catch (err) {
    console.error("[vercel] OpenRouter proxy error:", err);
    res.status(500).json({ error: "proxy_error", message: err?.message });
  }
}
