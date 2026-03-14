"use client";
import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "@/components/LoginPage";

function HomeContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    if (user.role === "student") router.replace("/student");
    else if (user.role === "advisor") router.replace("/staff/advisor");
    else if (user.role === "hod") router.replace("/staff/hod");
    else if (user.role === "warden") router.replace("/staff/warden");
    else if (user.role === "gatekeeper") router.replace("/gatekeeper");
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
          <p className="text-slate-400 text-sm font-display">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return null;
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 rounded-full animate-spin"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
