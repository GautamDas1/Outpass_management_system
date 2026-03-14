"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPendingForAdvisor, getAllForAdvisor } from "@/lib/db";
import type { Staff, OutpassForm } from "@/types";
import { format } from "date-fns";
import { FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/OutpassProgress";

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const staff = user?.profileData as Staff;
  const router = useRouter();
  const [pending, setPending] = useState<OutpassForm[]>([]);
  const [all, setAll] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!staff?.id) return;
      const [p, a] = await Promise.all([
        getPendingForAdvisor(staff.id),
        getAllForAdvisor(staff.id),
      ]);
      setPending(p);
      setAll(a);
      setLoading(false);
    }
    load();
  }, [staff?.id]);

  const stats = [
    { label: "Pending", value: pending.length, icon: Clock, color: "#f59e0b" },
    { label: "Approved", value: all.filter(o => o.advisorAction === "approved").length, icon: CheckCircle2, color: "#22c55e" },
    { label: "Rejected", value: all.filter(o => o.advisorAction === "rejected").length, icon: XCircle, color: "#ef4444" },
    { label: "Total", value: all.length, icon: FileText, color: "#5c7cfa" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Welcome, {staff?.name}</h1>
        <p className="text-slate-400 text-sm mt-1">{staff?.department} · Class Advisor · {format(new Date(), "EEEE, d MMMM yyyy")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <div className="card" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-display flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              {pending.length} Pending Review
            </h2>
            <button onClick={() => router.push("/staff/advisor/applications")} className="text-sm text-brand-400 hover:underline">
              Review all
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {pending.slice(0, 3).map(op => (
              <div key={op.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--elevated)" }}>
                <div className="flex-1">
                  <p className="text-sm font-medium">{op.studentName} <span className="text-slate-500 text-xs">({op.registerNo})</span></p>
                  <p className="text-xs text-slate-500">{op.purpose} · {format(new Date(op.outDate), "dd MMM")}</p>
                </div>
                <StatusBadge status={op.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="card text-center py-10">
          <CheckCircle2 size={32} className="text-green-400 mx-auto mb-3" />
          <p className="font-semibold font-display">All caught up!</p>
          <p className="text-sm text-slate-400 mt-1">No pending applications to review.</p>
        </div>
      )}
    </div>
  );
}
