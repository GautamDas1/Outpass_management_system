"use client";
import { useState } from "react";
import type { OutpassForm } from "@/types";
import { StatusBadge } from "@/components/OutpassProgress";
import { format } from "date-fns";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, User, Calendar, Clock } from "lucide-react";

interface Props {
  outpass: OutpassForm;
  role: "advisor" | "hod" | "warden";
  onAction: (id: string, action: "approved" | "rejected", remark: string) => Promise<void>;
  showActions?: boolean;
}

export default function OutpassReviewCard({ outpass, role, onAction, showActions = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  const canAct =
    showActions &&
    ((role === "advisor" && outpass.status === "pending_advisor") ||
     (role === "hod" && outpass.status === "pending_hod") ||
     (role === "warden" && outpass.status === "pending_warden"));

  async function handle(action: "approved" | "rejected") {
    if (action === "rejected" && !remark.trim()) {
      alert("Please enter a reason for rejection.");
      return;
    }
    setLoading(true);
    await onAction(outpass.id, action, remark);
    setLoading(false);
    setRejecting(false);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="font-bold font-display text-sm">{outpass.studentName}</span>
            <span className="text-xs text-slate-500 font-mono">{outpass.registerNo}</span>
            <StatusBadge status={outpass.status} />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><User size={11} />{outpass.department} · Sec {outpass.section}</span>
            <span className="flex items-center gap-1"><Calendar size={11} />
              {format(new Date(outpass.outDate), "dd MMM")}
              {outpass.outDate !== outpass.inDate && ` – ${format(new Date(outpass.inDate), "dd MMM")}`}
            </span>
            <span className="flex items-center gap-1"><Clock size={11} />{outpass.timeOut} – {outpass.timeIn}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            <span className="text-slate-500 text-xs">Purpose: </span>{outpass.purpose}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-white transition-colors shrink-0 p-1"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          {/* Full details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg mb-4"
            style={{ background: "var(--elevated)" }}>
            {[
              { label: "Room No.", value: outpass.roomNo },
              { label: "Year / Sem", value: `${outpass.year} / ${outpass.semester}` },
              { label: "Time Out", value: outpass.timeOut },
              { label: "Time In", value: outpass.timeIn },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Previous approvals */}
          {outpass.advisorAction && (
            <div className="flex items-center gap-2 text-xs p-3 rounded-lg mb-2"
              style={{ background: outpass.advisorAction === "approved" ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)" }}>
              {outpass.advisorAction === "approved"
                ? <CheckCircle2 size={13} className="text-green-400" />
                : <XCircle size={13} className="text-red-400" />}
              <span className="text-slate-400">Advisor {outpass.advisorAction}</span>
              {outpass.advisorRemark && <span className="text-slate-500">— {outpass.advisorRemark}</span>}
            </div>
          )}
          {outpass.hodAction && (
            <div className="flex items-center gap-2 text-xs p-3 rounded-lg mb-2"
              style={{ background: outpass.hodAction === "approved" ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)" }}>
              {outpass.hodAction === "approved"
                ? <CheckCircle2 size={13} className="text-green-400" />
                : <XCircle size={13} className="text-red-400" />}
              <span className="text-slate-400">HOD {outpass.hodAction}</span>
              {outpass.hodRemark && <span className="text-slate-500">— {outpass.hodRemark}</span>}
            </div>
          )}

          {/* Action buttons */}
          {canAct && !rejecting && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handle("approved")}
                disabled={loading}
                className="btn-primary flex-1 justify-center py-2.5"
                style={{ background: "#22c55e" }}
              >
                <CheckCircle2 size={16} />
                {loading ? "Processing..." : "Approve"}
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={loading}
                className="btn-danger flex-1 justify-center py-2.5"
              >
                <XCircle size={16} />
                Reject
              </button>
            </div>
          )}

          {canAct && rejecting && (
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="label">Reason for Rejection *</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Enter reason..."
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handle("rejected")}
                  disabled={loading || !remark.trim()}
                  className="btn-danger flex-1 justify-center"
                >
                  {loading ? "Submitting..." : "Confirm Reject"}
                </button>
                <button onClick={() => { setRejecting(false); setRemark(""); }} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
