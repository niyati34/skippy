// Deprecated: Azure endpoint has been removed. Use /api/openrouter/chat instead.
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.status(410).json({
    error: "gone",
    message: "Azure endpoint removed. Use /api/openrouter/chat",
  });
}
