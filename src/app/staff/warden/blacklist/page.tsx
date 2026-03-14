"use client";
import { useEffect, useState } from "react";
import { getAllStudents, updateStudent } from "@/lib/db";
import type { Student } from "@/types";
import toast from "react-hot-toast";
import { UserX, UserCheck, Search, AlertTriangle, Clock, Calendar, ShieldOff } from "lucide-react";
import { format, addDays, differenceInHours, parseISO } from "date-fns";

const MAX_DAYS = 7;

export default function WardenBlacklist() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "blacklisted">("all");

  // Blacklist modal state
  const [blacklistTarget, setBlacklistTarget] = useState<Student | null>(null);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(3);
  const [saving, setSaving] = useState(false);

  // Remove confirmation modal state
  const [removeTarget, setRemoveTarget] = useState<Student | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    const data = await getAllStudents();
    setStudents(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleBlacklist() {
    if (!blacklistTarget || !reason.trim()) return;
    setSaving(true);
    const until = addDays(new Date(), days).toISOString();
    await updateStudent(blacklistTarget.id, {
      isBlacklisted: true,
      blacklistReason: reason.trim(),
      blacklistUntil: until,
    });
    toast.success(`${blacklistTarget.name} blacklisted for ${days} day${days > 1 ? "s" : ""}`);
    setBlacklistTarget(null);
    setReason("");
    setDays(3);
    await load();
    setSaving(false);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    await updateStudent(removeTarget.id, {
      isBlacklisted: false,
      blacklistReason: "",
      blacklistUntil: "",
    });
    toast.success(`${removeTarget.name} removed from blacklist`);
    setRemoveTarget(null);
    await load();
    setRemoving(false);
  }

  function timeRemaining(until: string): string {
    const h = differenceInHours(parseISO(until), new Date());
    if (h < 1) return "< 1 hour";
    if (h < 24) return `${h}h remaining`;
    const d = Math.ceil(h / 24);
    return `${d} day${d > 1 ? "s" : ""} remaining`;
  }

  const filtered = students
    .filter((s) => tab === "blacklisted" ? s.isBlacklisted : true)
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.registerNo.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
    );

  const blacklistedCount = students.filter((s) => s.isBlacklisted).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Blacklist Management</h1>
        <p className="text-slate-400 text-sm mt-1">
          Temporary bans · Max {MAX_DAYS} days · Auto-removed on expiry · Remove manually anytime
        </p>
      </div>

      {/* ── BLACKLIST MODAL ─────────────────────────────────────── */}
      {blacklistTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(239,68,68,0.1)" }}>
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <p className="font-bold font-display">Blacklist Student</p>
                <p className="text-sm text-slate-400">{blacklistTarget.name} · {blacklistTarget.registerNo}</p>
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <Calendar size={13} /> Duration (1–{MAX_DAYS} days) *
              </label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={1}
                  max={MAX_DAYS}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="flex-1 accent-red-500"
                />
                <div className="w-20 text-center py-2 rounded-lg font-bold font-display text-red-400"
                  style={{ background: "rgba(239,68,68,0.1)" }}>
                  {days}d
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Auto-expires on{" "}
                <span className="text-slate-300 font-medium">
                  {format(addDays(new Date(), days), "dd MMM yyyy, h:mm a")}
                </span>
              </p>
            </div>

            <div>
              <label className="label">Reason *</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="e.g. Returned late without valid reason, violated hostel rules..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg text-xs"
              style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Clock size={13} className="text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-slate-400">
                Max duration is <strong className="text-white">{MAX_DAYS} days</strong>.
                Auto-removed on expiry. You can also remove it manually before expiry.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBlacklist}
                disabled={saving || !reason.trim()}
                className="btn-danger flex-1 justify-center"
              >
                {saving ? "Saving..." : `Blacklist for ${days} day${days > 1 ? "s" : ""}`}
              </button>
              <button
                onClick={() => { setBlacklistTarget(null); setReason(""); setDays(3); }}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REMOVE CONFIRMATION MODAL ────────────────────────────── */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <ShieldOff size={20} className="text-green-400" />
              </div>
              <div>
                <p className="font-bold font-display">Remove Blacklist</p>
                <p className="text-sm text-slate-400">{removeTarget.name} · {removeTarget.registerNo}</p>
              </div>
            </div>

            {/* Show current ban details */}
            <div className="p-4 rounded-xl flex flex-col gap-2"
              style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
              {(removeTarget as any).blacklistReason && (
                <div>
                  <p className="text-xs text-slate-500">Blacklist reason</p>
                  <p className="text-sm text-red-400 mt-0.5">{(removeTarget as any).blacklistReason}</p>
                </div>
              )}
              {(removeTarget as any).blacklistUntil && (
                <div>
                  <p className="text-xs text-slate-500">Was set to expire</p>
                  <p className="text-sm text-yellow-400 mt-0.5 flex items-center gap-1">
                    <Clock size={12} />
                    {format(parseISO((removeTarget as any).blacklistUntil), "dd MMM yyyy, h:mm a")}
                    {" "}({timeRemaining((removeTarget as any).blacklistUntil)})
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-slate-300">
              Are you sure you want to remove the blacklist from{" "}
              <span className="font-semibold text-white">{removeTarget.name}</span>?
              They will be able to apply for outpass immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="btn-primary flex-1 justify-center"
                style={{ background: "#22c55e" }}
              >
                <UserCheck size={16} />
                {removing ? "Removing..." : "Yes, Remove Blacklist"}
              </button>
              <button
                onClick={() => setRemoveTarget(null)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS + SEARCH ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 p-1 rounded-xl"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setTab("all")}
            className="px-4 py-2 rounded-lg text-sm font-medium font-display transition-all"
            style={{
              background: tab === "all" ? "var(--brand)" : "transparent",
              color: tab === "all" ? "white" : "var(--text-secondary)",
            }}
          >
            All Students ({students.length})
          </button>
          <button
            onClick={() => setTab("blacklisted")}
            className="px-4 py-2 rounded-lg text-sm font-medium font-display transition-all"
            style={{
              background: tab === "blacklisted" ? "#ef4444" : "transparent",
              color: tab === "blacklisted" ? "white" : "var(--text-secondary)",
            }}
          >
            Blacklisted ({blacklistedCount})
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-9"
            placeholder="Search by name, register no., department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── STUDENT LIST ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">No students found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="card flex items-center gap-4 transition-all"
              style={student.isBlacklisted ? { borderColor: "rgba(239,68,68,0.3)" } : {}}
            >
              {/* Avatar */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold font-display shrink-0"
                style={{
                  background: student.isBlacklisted ? "rgba(239,68,68,0.1)" : "rgba(92,124,250,0.1)",
                  color: student.isBlacklisted ? "#ef4444" : "#5c7cfa",
                }}
              >
                {student.name[0]}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{student.name}</p>
                  {student.isBlacklisted && (
                    <span className="badge badge-rejected flex items-center gap-1">
                      <UserX size={10} /> Blacklisted
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {student.registerNo} · {student.department} · Sec {student.section} · Room {student.roomNo || "—"}
                </p>
                {student.isBlacklisted && (
                  <div className="mt-1 flex flex-col gap-0.5">
                    {(student as any).blacklistReason && (
                      <p className="text-xs text-red-400">
                        Reason: {(student as any).blacklistReason}
                      </p>
                    )}
                    {(student as any).blacklistUntil && (
                      <p className="text-xs text-yellow-400 flex items-center gap-1">
                        <Clock size={10} />
                        {timeRemaining((student as any).blacklistUntil)} · expires{" "}
                        {format(parseISO((student as any).blacklistUntil), "dd MMM, h:mm a")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {student.isBlacklisted ? (
                <button
                  onClick={() => setRemoveTarget(student)}
                  className="btn-secondary shrink-0 flex items-center gap-1.5 text-green-400 border-green-400/30 hover:border-green-400 text-xs py-2 px-3"
                >
                  <UserCheck size={14} /> Remove
                </button>
              ) : (
                <button
                  onClick={() => setBlacklistTarget(student)}
                  className="btn-secondary shrink-0 flex items-center gap-1.5 text-red-400 border-red-400/30 hover:border-red-400 text-xs py-2 px-3"
                >
                  <UserX size={14} /> Blacklist
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
