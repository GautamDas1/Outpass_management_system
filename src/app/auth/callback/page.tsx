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

    // With detectSessionInUrl: true, supabase-js automatically reads the
    // ?code= param from the URL and exchanges it using the PKCE verifier
    // stored in localStorage. We just listen for the session to appear.
    const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        router.replace("/");
      }
    });

    // Also check if session already exists (e.g. page reloaded)
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        router.replace("/");
      }
    });

    // Timeout fallback — if nothing happens in 8 seconds, go home anyway
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.replace("/");
    }, 8000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
        />
        <p className="text-slate-400 text-sm font-display">Completing sign in...</p>
      </div>
    </div>
  );
}
