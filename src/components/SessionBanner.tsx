import { useEffect, useState } from "react";
import { verifySession } from "@/lib/session";

export default function SessionBanner() {
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await verifySession();
      if (mounted) setExpired(!ok);
    };
    const id = window.setInterval(check, 5 * 60 * 1000);
    // also run once in the background; don’t flip UI on first mount
    check();
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  if (!expired) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-amber-50 text-amber-900 border border-amber-300 rounded-full px-4 py-2 shadow-sm">
      Session expired. Please refresh to unlock again.
    </div>
  );
}
