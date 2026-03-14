"use client";
import { useEffect, useState } from "react";
import { getAllOutpasses } from "@/lib/db";
import type { OutpassForm } from "@/types";
import OutpassReviewCard from "@/components/OutpassReviewCard";

export default function WardenHistory() {
  const [outpasses, setOutpasses] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllOutpasses().then(data => { setOutpasses(data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">All Applications</h1>
        <p className="text-slate-400 text-sm mt-1">{outpasses.length} total records</p>
      </div>
      {outpasses.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">No applications yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {outpasses.map(op => <OutpassReviewCard key={op.id} outpass={op} role="warden" onAction={async () => {}} showActions={false} />)}
        </div>
      )}
    </div>
  );
}
