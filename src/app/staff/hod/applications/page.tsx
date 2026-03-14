"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPendingForHOD, updateOutpass } from "@/lib/db";
import type { Staff, OutpassForm } from "@/types";
import OutpassReviewCard from "@/components/OutpassReviewCard";
import toast from "react-hot-toast";

export default function HODApplications() {
  const { user } = useAuth();
  const staff = user?.profileData as Staff;
  const [pending, setPending] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!staff?.department) return;
    const data = await getPendingForHOD(staff.department);
    setPending(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [staff?.department]);

  async function handleAction(id: string, action: "approved" | "rejected", remark: string) {
    const now = new Date().toISOString();
    if (action === "approved") {
      await updateOutpass(id, { hodAction: "approved", hodActionAt: now, status: "pending_warden" });
      toast.success("Forwarded to Warden");
    } else {
      await updateOutpass(id, { hodAction: "rejected", hodRemark: remark, hodActionAt: now, status: "rejected" });
      toast.success("Application rejected");
    }
    await load();
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Pending Applications</h1>
        <p className="text-slate-400 text-sm mt-1">{pending.length} awaiting review</p>
      </div>
      {pending.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">No pending applications.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map(op => <OutpassReviewCard key={op.id} outpass={op} role="hod" onAction={handleAction} />)}
        </div>
      )}
    </div>
  );
}
