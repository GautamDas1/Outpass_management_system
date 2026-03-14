"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getStudentOutpasses } from "@/lib/db";
import type { Student, OutpassForm } from "@/types";
import { StatusBadge } from "@/components/OutpassProgress";
import OutpassProgress from "@/components/OutpassProgress";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, QrCode } from "lucide-react";

export default function StudentHistory() {
  const { user } = useAuth();
  const student = user?.profileData as Student;
  const [outpasses, setOutpasses] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!student?.id) return;
      const data = await getStudentOutpasses(student.id);
      setOutpasses(data);
      setLoading(false);
    }
    load();
  }, [student?.id]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">My Outpasses</h1>
        <p className="text-slate-400 text-sm mt-1">{outpasses.length} application{outpasses.length !== 1 ? "s" : ""} total</p>
      </div>

      {outpasses.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-400">No outpass applications yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {outpasses.map(op => (
            <div key={op.id} className="card overflow-hidden">
              <div
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => setExpanded(expanded === op.id ? null : op.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-sm truncate">{op.purpose}</p>
                    <StatusBadge status={op.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(op.outDate), "dd MMM yyyy")}
                    {op.outDate !== op.inDate && ` → ${format(new Date(op.inDate), "dd MMM yyyy")}`}
                    {" · "}
                    {op.timeOut} – {op.timeIn}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Applied {format(new Date(op.createdAt), "dd MMM yyyy, h:mm a")}
                  </p>
                </div>
                {expanded === op.id ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
              </div>

              {expanded === op.id && (
                <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
                  <OutpassProgress outpass={op} />

                  {op.status === "approved" && op.qrCode && (
                    <div className="mt-4 flex flex-col items-center gap-3 p-5 rounded-xl"
                      style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <div className="flex items-center gap-2 text-green-400 font-semibold font-display text-sm">
                        <QrCode size={16} />
                        Approved — Show QR at gate
                      </div>
                      <img src={op.qrCode} alt="QR Code" className="w-44 h-44 rounded-lg" />
                      {op.scannedOut && (
                        <p className="text-xs text-slate-400">
                          Scanned out: {op.scannedOutAt ? format(new Date(op.scannedOutAt), "dd MMM, h:mm a") : "—"}
                        </p>
                      )}
                      {op.scannedIn && (
                        <p className="text-xs text-green-400">
                          ✓ Returned: {op.scannedInAt ? format(new Date(op.scannedInAt), "dd MMM, h:mm a") : "—"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
