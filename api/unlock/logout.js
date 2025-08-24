export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  // Expire cookie
  res.setHeader("Set-Cookie", [
    "skippy_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" +
      (process.env.VERCEL || process.env.NODE_ENV === "production"
        ? "; Secure"
        : ""),
  ]);
  return res.status(200).json({ ok: true });
}
