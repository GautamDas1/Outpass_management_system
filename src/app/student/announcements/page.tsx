"use client";
import { useEffect, useState } from "react";
import { subscribeToAnnouncements } from "@/lib/db";
import type { Announcement } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import type { Student } from "@/types";
import { Bell, Megaphone } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function StudentAnnouncements() {
  const { user } = useAuth();
  const student = user?.profileData as Student;
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAnnouncements((data) => {
      const filtered = data.filter(a =>
        !a.targetDepartment || a.targetDepartment === student?.department
      );
      setAnnouncements(filtered);
      setLoading(false);
    });
    return unsub;
  }, [student?.department]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(92,124,250,0.1)" }}>
          <Bell size={20} style={{ color: "var(--brand)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display">Announcements</h1>
          <p className="text-slate-400 text-sm">{announcements.length} notice{announcements.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="card text-center py-16">
          <Megaphone size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No announcements yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map(a => (
            <div key={a.id} className="card" style={{ borderLeft: "3px solid var(--brand)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold font-display text-base">{a.title}</h3>
                  <p className="text-slate-300 text-sm mt-2 leading-relaxed">{a.message}</p>
                  {a.targetDepartment && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(92,124,250,0.1)", color: "var(--brand)" }}>
                      {a.targetDepartment} only
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t"
                style={{ borderColor: "var(--border)" }}>
                <p className="text-xs text-slate-500">
                  By <span className="text-slate-400 font-medium">{a.staffName}</span>
                  {" "}· {a.staffDesignation}
                </p>
                <p className="text-xs text-slate-600">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
