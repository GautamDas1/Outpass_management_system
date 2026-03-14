"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeToAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAllStudents,
} from "@/lib/db";
import type { Staff, Announcement } from "@/types";
import toast from "react-hot-toast";
import { Bell, Plus, Trash2, X, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function StaffAnnouncements() {
  const { user } = useAuth();
  const staff = user?.profileData as Staff;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", message: "", targetDepartment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
    getAllStudents().then(students => {
      const depts = Array.from(new Set(students.map(s => s.department)));
      setDepartments(depts);
    });
    return unsub;
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    setSubmitting(true);
    await createAnnouncement({
      title: form.title,
      message: form.message,
      staffId: staff.id,
      staffName: staff.name,
      staffDesignation: staff.designation,
      targetDepartment: form.targetDepartment || undefined,
      createdAt: new Date().toISOString(),
    });
    toast.success("Announcement posted!");
    setForm({ title: "", message: "", targetDepartment: "" });
    setShowForm(false);
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await deleteAnnouncement(id);
    toast.success("Deleted");
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(92,124,250,0.1)" }}>
            <Bell size={20} style={{ color: "var(--brand)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Announcements</h1>
            <p className="text-slate-400 text-sm">{announcements.length} posted</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> New</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card mb-6" style={{ borderColor: "rgba(92,124,250,0.3)" }}>
          <h3 className="font-bold font-display mb-4">New Announcement</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Title *</label>
              <input className="input" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Message *</label>
              <textarea className="input resize-none" rows={3} placeholder="Write your announcement..." value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Target Department (leave blank for all)</label>
              <select className="input" value={form.targetDepartment} onChange={e => setForm(f => ({ ...f, targetDepartment: e.target.value }))}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary justify-center">
              <Megaphone size={16} />
              {submitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <div className="card text-center py-16 text-slate-400">No announcements yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map(a => (
            <div key={a.id} className="card" style={{ borderLeft: "3px solid var(--brand)" }}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-bold font-display">{a.title}</h3>
                  <p className="text-slate-300 text-sm mt-1 leading-relaxed">{a.message}</p>
                  {a.targetDepartment && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(92,124,250,0.1)", color: "var(--brand)" }}>
                      {a.targetDepartment} only
                    </span>
                  )}
                </div>
                {a.staffId === staff?.id && (
                  <button onClick={() => handleDelete(a.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs text-slate-500">By <span className="text-slate-400">{a.staffName}</span> · {a.staffDesignation}</p>
                <p className="text-xs text-slate-600">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
