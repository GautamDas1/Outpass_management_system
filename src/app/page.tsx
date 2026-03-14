"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/components/LoginPage";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // ← FIXED: removed !loading check so redirect fires even when loading is already false
    if (user) {
      if (user.role === "student") router.push("/student");
      else if (user.role === "advisor") router.push("/staff/advisor");
      else if (user.role === "hod") router.push("/staff/hod");
      else if (user.role === "warden") router.push("/staff/warden");
      else if (user.role === "gatekeeper") router.push("/gatekeeper");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
          <p className="text-slate-400 text-sm font-display">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return null;
}
