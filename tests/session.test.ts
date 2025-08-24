import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifySession, logoutSession } from "@/lib/session";

const originalFetch = global.fetch;

describe("session helpers", () => {
  beforeEach(() => {
    // @ts-expect-error override in test
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch as any;
    vi.restoreAllMocks();
  });

  it("verifySession returns true when server ok", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });
    const ok = await verifySession();
    expect(ok).toBe(true);
  });

  it("verifySession returns false when server not ok", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: false });
    const ok = await verifySession();
    expect(ok).toBe(false);
  });

  it("logoutSession posts to logout endpoint without throwing", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    await expect(logoutSession()).resolves.toBeUndefined();
  });
});
