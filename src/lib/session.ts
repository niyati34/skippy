export async function verifySession(): Promise<boolean> {
  try {
    const tryVerify = async (url: string) => {
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json())?.ok === true;
    };
    return (
      (await tryVerify("/api/unlock/verify").catch(() => false)) ||
      (await tryVerify("http://localhost:5174/api/unlock/verify").catch(
        () => false
      ))
    );
  } catch {
    return false;
  }
}

export async function logoutSession(): Promise<void> {
  const call = async (url: string) => {
    await fetch(url, { method: "POST", credentials: "include" });
  };
  await call("/api/unlock/logout").catch(() => call("http://localhost:5174/api/unlock/logout"));
}
