import { useEffect, useState } from "react";
import { verifySession } from "@/lib/session";

interface RouteGuardProps {
  children: React.ReactNode;
  redirect?: string; // optional path to redirect if not authenticated
}

export default function RouteGuard({ children, redirect = "/" }: RouteGuardProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await verifySession();
      if (!cancelled) setAllowed(ok);
      if (!ok) {
        // Defer navigation; the unlock flow on Index handles UI
        // Using location replace avoids adding a history entry
        window.location.replace(redirect);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [redirect]);

  if (allowed === null) return null; // simple guard; page-level spinner could be added
  if (!allowed) return null;
  return <>{children}</>;
}
