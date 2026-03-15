"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const sb = getSupabase();
    let redirected = false;

    function doRedirect() {
      if (redirected) return;
      redirected = true;
      router.replace("/");
    }

    // Listen for SIGNED_IN — fires when PKCE exchange completes
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        subscription.unsubscribe();
        doRedirect();
      }
    });

    // Fallback timeout
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      doRedirect();
    }, 6000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
        <p className="text-slate-400 text-sm font-display">Completing sign in...</p>
      </div>
    </div>
  );
}
