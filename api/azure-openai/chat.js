// Vercel serverless function for Azure OpenAI proxy
export default async function handler(req, res) {
  // Enable CORS
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

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages, options } = req.body || {};

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Get environment variables
    const API_BASE =
      process.env.VITE_OPENAI_API_BASE || process.env.OPENAI_API_BASE || "";
    const API_KEY =
      process.env.VITE_AZURE_OPENAI_KEY ||
      process.env.AZURE_OPENAI_API_KEY ||
      "";
    const API_VERSION =
      process.env.VITE_AZURE_OPENAI_API_VERSION ||
      process.env.AZURE_OPENAI_API_VERSION ||
      "2025-01-01-preview";
    const DEPLOYMENT =
      process.env.VITE_AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME ||
      "gpt-4o";

    if (!API_BASE || !API_KEY) {
      console.error("[vercel] Missing Azure OpenAI environment variables");
      return res.status(500).json({
        error: "Configuration error",
        message: "Azure OpenAI environment variables not configured",
      });
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

    console.log("[vercel] Making request to Azure OpenAI...");

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
      console.error("[vercel] Azure OpenAI error:", response.status, text);
      return res.status(response.status).json({
        error: "Azure OpenAI API error",
        message: text,
        status: response.status,
      });
    }

    // Parse and return the JSON response
    const jsonResponse = JSON.parse(text);
    res.status(200).json(jsonResponse);
  } catch (err) {
    console.error("[vercel] Proxy error:", err);
    res.status(500).json({
      error: "proxy_error",
      message: err?.message || "Unknown error",
    });
  }
}
