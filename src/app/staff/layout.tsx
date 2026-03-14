"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !["advisor","hod","warden"].includes(user.role))) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pt-14 lg:pt-0 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
