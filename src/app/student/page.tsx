"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getStudentActiveOutpass, getStudentOutpasses } from "@/lib/db";
import type { OutpassForm, Student } from "@/types";
import OutpassProgress, { StatusBadge } from "@/components/OutpassProgress";
import { FileText, Clock, CheckCircle2, XCircle, Plus, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Image from "next/image";

export default function StudentDashboard() {
  const { user } = useAuth();
  const student = user?.profileData as Student;
  const router = useRouter();
  const [activeOutpass, setActiveOutpass] = useState<OutpassForm | null>(null);
  const [history, setHistory] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!student?.id) return;
      const [active, all] = await Promise.all([
        getStudentActiveOutpass(student.id),
        getStudentOutpasses(student.id),
      ]);
      setActiveOutpass(active);
      setHistory(all.slice(0, 5));
      setLoading(false);
    }
    load();
  }, [student?.id]);

  const stats = [
    { label: "Total Applied", value: history.length, icon: FileText, color: "#5c7cfa" },
    { label: "Approved", value: history.filter(o => o.status === "approved").length, icon: CheckCircle2, color: "#22c55e" },
    { label: "Rejected", value: history.filter(o => o.status === "rejected").length, icon: XCircle, color: "#ef4444" },
    { label: "Pending", value: history.filter(o => ["pending_advisor","pending_hod","pending_warden"].includes(o.status)).length, icon: Clock, color: "#f59e0b" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">
            Hello, {student?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>
        {!activeOutpass && (
          <button onClick={() => router.push("/student/apply")} className="btn-primary">
            <Plus size={16} />
            Apply Outpass
          </button>
        )}
      </div>

      {/* Blacklist warning */}
      {student?.isBlacklisted && (
        <div className="flex items-start gap-3 p-4 rounded-xl border"
          style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.3)" }}>
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-400 text-sm">Account Blacklisted</p>
            <p className="text-sm text-slate-400 mt-0.5">
              {student.blacklistReason || "You have been blacklisted. Contact the warden."}
            </p>
          </div>
        </div>
      )}

      {/* Profile card */}
      <div className="card flex items-center gap-5">
        {user?.photoURL ? (
          <Image src={user.photoURL} alt="avatar" width={56} height={56} className="rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold font-display shrink-0"
            style={{ background: "linear-gradient(135deg, #5c7cfa, #748ffc)", color: "white" }}>
            {student?.name?.[0]}
          </div>
        )}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Name", value: student?.name },
            { label: "Register No.", value: student?.registerNo },
            { label: "Department", value: student?.department },
            { label: "Section", value: `${student?.year} Year · Sec ${student?.section}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-500 font-display">{label}</p>
              <p className="text-sm font-semibold mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex flex-col gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${color}18`, color }}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active outpass */}
      {activeOutpass && (
        <div className="card" style={{ borderColor: "rgba(92,124,250,0.3)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold font-display">Active Application</h2>
            <StatusBadge status={activeOutpass.status} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-lg"
            style={{ background: "var(--elevated)" }}>
            {[
              { label: "Purpose", value: activeOutpass.purpose },
              { label: "Out Date", value: format(new Date(activeOutpass.outDate), "dd MMM yyyy") },
              { label: "In Date", value: format(new Date(activeOutpass.inDate), "dd MMM yyyy") },
              { label: "Time Out", value: activeOutpass.timeOut },
              { label: "Time In", value: activeOutpass.timeIn },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
          <OutpassProgress outpass={activeOutpass} />
          {activeOutpass.status === "approved" && activeOutpass.qrCode && (
            <div className="mt-4 flex flex-col items-center gap-3 p-4 rounded-xl"
              style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <p className="text-green-400 font-semibold font-display text-sm">✓ Outpass Approved — Show QR at gate</p>
              <img src={activeOutpass.qrCode} alt="QR Code" className="w-40 h-40 rounded-lg" />
              <p className="text-xs text-slate-500">Valid: {format(new Date(activeOutpass.outDate), "dd MMM")} – {format(new Date(activeOutpass.inDate), "dd MMM yyyy")}</p>
            </div>
          )}
        </div>
      )}

      {/* No active outpass CTA */}
      {!activeOutpass && (
        <div className="card flex flex-col items-center gap-4 py-10 text-center"
          style={{ borderStyle: "dashed" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(92,124,250,0.1)" }}>
            <FileText size={22} style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <p className="font-semibold font-display">No active outpass</p>
            <p className="text-sm text-slate-400 mt-1">Apply for an outpass to leave the campus</p>
          </div>
          <button onClick={() => router.push("/student/apply")} className="btn-primary">
            <Plus size={16} /> Apply Now
          </button>
        </div>
      )}

      {/* Recent history */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold font-display">Recent Applications</h2>
            <button onClick={() => router.push("/student/history")}
              className="text-sm text-brand-400 hover:underline">View all</button>
          </div>
          <div className="flex flex-col gap-2">
            {history.slice(0, 3).map(op => (
              <div key={op.id} className="card flex items-center gap-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{op.purpose}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {format(new Date(op.outDate), "dd MMM")} → {format(new Date(op.inDate), "dd MMM yyyy")}
                  </p>
                </div>
                <StatusBadge status={op.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
