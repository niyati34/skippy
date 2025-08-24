// Vercel serverless function: OpenRouter proxy with tightened CORS and model overrides
export default async function handler(req, res) {
  // Compute CORS policy
  const origin = req.headers?.origin || "";
  const allowed = (process.env.OPENROUTER_ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowAny = allowed.length === 0 || allowed.includes("*");
  const originAllowed = allowAny || (origin && allowed.includes(origin));

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    originAllowed ? origin || "*" : "null"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // Block disallowed origins if a strict allowlist is configured
  if (!originAllowed) {
    return res.status(403).json({ error: "forbidden_origin" });
  }

  try {
    const { messages, options } = req.body || {};
    if (!Array.isArray(messages)) {
      return res
        .status(400)
        .json({ error: "bad_request", message: "messages array required" });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY || "";
    const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "gpt-oss-20b";
    const ALLOWED_MODELS = (process.env.OPENROUTER_ALLOWED_MODELS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ENDPOINT =
      process.env.OPENROUTER_API_BASE ||
      "https://openrouter.ai/api/v1/chat/completions";

    if (!API_KEY) {
      console.error("[vercel] Missing OPENROUTER_API_KEY");
      return res.status(500).json({
        error: "config_error",
        message: "OPENROUTER_API_KEY not configured",
      });
    }

    // Use client-provided model if allowed, else default
    let model = (options && options.model) || DEFAULT_MODEL;
    if (ALLOWED_MODELS.length > 0 && !ALLOWED_MODELS.includes(model)) {
      model = DEFAULT_MODEL;
    }

    const payload = {
      model,
      messages,
      max_tokens: options?.max_tokens ?? 2000,
      temperature: options?.temperature ?? 0.3,
      top_p: options?.top_p ?? 0.95,
      frequency_penalty: options?.frequency_penalty ?? 0,
      presence_penalty: options?.presence_penalty ?? 0,
    };

    // Prefer request origin; fallback to Vercel URL if available
    const siteUrl =
      origin ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined) ||
      "https://skippy-kohl.vercel.app";

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      // Optional but recommended by OpenRouter
      "HTTP-Referer": siteUrl,
      "X-Title": "Skippy",
    };

    console.log("[vercel] OpenRouter request", {
      model,
      referer: siteUrl,
      origin,
    });

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {}
      console.error("[vercel] OpenRouter error:", response.status, text);
      return res.status(response.status).json({
        error: "openrouter_error",
        status: response.status,
        message: parsed?.error || parsed?.message || text,
      });
    }

    // Pass through JSON
    res.status(200).type("application/json").send(text);
  } catch (err) {
    console.error("[vercel] OpenRouter proxy error:", err);
    res.status(500).json({ error: "proxy_error", message: err?.message });
  }
}
