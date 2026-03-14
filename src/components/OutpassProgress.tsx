"use client";
import { CheckCircle2, XCircle, Clock, Circle } from "lucide-react";
import type { OutpassForm } from "@/types";

interface Props {
  outpass: OutpassForm;
}

export default function OutpassProgress({ outpass }: Props) {
  const steps = [
    {
      label: "Class Advisor",
      key: "advisor",
      action: outpass.advisorAction,
      remark: outpass.advisorRemark,
      name: outpass.advisorName,
      at: outpass.advisorActionAt,
    },
    {
      label: "HOD",
      key: "hod",
      action: outpass.hodAction,
      remark: outpass.hodRemark,
      name: outpass.hodName,
      at: outpass.hodActionAt,
    },
    {
      label: "Warden",
      key: "warden",
      action: outpass.wardenAction,
      remark: outpass.wardenRemark,
      name: outpass.wardenName,
      at: outpass.wardenActionAt,
    },
  ];

  function getStepState(step: typeof steps[0], index: number) {
    if (step.action === "approved") return "approved";
    if (step.action === "rejected") return "rejected";
    const statusMap: Record<string, number> = {
      pending_advisor: 0,
      pending_hod: 1,
      pending_warden: 2,
      approved: 3,
      rejected: -1,
    };
    const currentStep = statusMap[outpass.status] ?? -1;
    if (currentStep === index) return "pending";
    return "waiting";
  }

  return (
    <div className="flex flex-col gap-0">
      {steps.map((step, i) => {
        const state = getStepState(step, i);
        return (
          <div key={step.key}>
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    background: state === "approved" ? "rgba(34,197,94,0.1)" :
                      state === "rejected" ? "rgba(239,68,68,0.1)" :
                      state === "pending" ? "rgba(92,124,250,0.1)" : "transparent",
                    borderColor: state === "approved" ? "#22c55e" :
                      state === "rejected" ? "#ef4444" :
                      state === "pending" ? "#5c7cfa" : "var(--border)",
                  }}>
                  {state === "approved" ? <CheckCircle2 size={18} className="text-green-400" /> :
                   state === "rejected" ? <XCircle size={18} className="text-red-400" /> :
                   state === "pending" ? <Clock size={18} className="text-brand-400" /> :
                   <Circle size={18} className="text-slate-600" />}
                </div>
                {i < 2 && (
                  <div className="w-0.5 h-10 mt-1"
                    style={{ background: state === "approved" ? "#22c55e" : "var(--border)" }} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex items-center justify-between">
                  <p className="font-semibold font-display text-sm"
                    style={{ color: state === "waiting" ? "var(--text-secondary)" : "var(--text-primary)" }}>
                    {step.label}
                  </p>
                  <span className="badge"
                    style={{
                      background: state === "approved" ? "rgba(34,197,94,0.15)" :
                        state === "rejected" ? "rgba(239,68,68,0.15)" :
                        state === "pending" ? "rgba(92,124,250,0.15)" : "rgba(100,116,139,0.1)",
                      color: state === "approved" ? "#22c55e" :
                        state === "rejected" ? "#ef4444" :
                        state === "pending" ? "#5c7cfa" : "#64748b",
                    }}>
                    {state === "approved" ? "Approved" :
                     state === "rejected" ? "Rejected" :
                     state === "pending" ? "Pending" : "Waiting"}
                  </span>
                </div>
                {step.name && (
                  <p className="text-xs text-slate-500 mt-0.5">{step.name}</p>
                )}
                {step.remark && (
                  <p className="text-xs text-red-400 mt-1 p-2 rounded"
                    style={{ background: "rgba(239,68,68,0.05)" }}>
                    Reason: {step.remark}
                  </p>
                )}
                {step.at && (
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(step.at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StatusBadge({ status }: { status: OutpassForm["status"] }) {
  const map = {
    pending_advisor: { label: "Pending Advisor", cls: "badge-pending" },
    pending_hod: { label: "Pending HOD", cls: "badge-pending" },
    pending_warden: { label: "Pending Warden", cls: "badge-pending" },
    approved: { label: "Approved", cls: "badge-approved" },
    rejected: { label: "Rejected", cls: "badge-rejected" },
    expired: { label: "Expired", cls: "badge-expired" },
  };
  const { label, cls } = map[status] || { label: status, cls: "badge-expired" };
  return <span className={`badge ${cls}`}>{label}</span>;
}
