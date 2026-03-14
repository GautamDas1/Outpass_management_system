"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getAllForHOD } from "@/lib/db";
import type { Staff, OutpassForm } from "@/types";
import OutpassReviewCard from "@/components/OutpassReviewCard";

export default function HODHistory() {
  const { user } = useAuth();
  const staff = user?.profileData as Staff;
  const [outpasses, setOutpasses] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!staff?.department) return;
      const data = await getAllForHOD(staff.department);
      setOutpasses(data);
      setLoading(false);
    }
    load();
  }, [staff?.department]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Application History</h1>
        <p className="text-slate-400 text-sm mt-1">{outpasses.length} total</p>
      </div>
      {outpasses.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">No applications yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {outpasses.map(op => <OutpassReviewCard key={op.id} outpass={op} role="hod" onAction={async () => {}} showActions={false} />)}
        </div>
      )}
    </div>
  );
}
