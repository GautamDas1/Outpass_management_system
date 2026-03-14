"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getStudentActiveOutpass,
  createOutpass,
  getAdvisorForStudent,
  getHODForDepartment,
  getWarden,
} from "@/lib/db";
import type { Student } from "@/types";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Send, AlertTriangle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function ApplyOutpass() {
  const { user } = useAuth();
  const student = user?.profileData as Student;
  const router = useRouter();

  const [hasActive, setHasActive] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const [form, setForm] = useState({
    purpose: "",
    outDate: today,
    inDate: today,
    sameDay: true,
    timeOut: "09:00",
    timeIn: "18:00",
  });

  useEffect(() => {
    async function check() {
      if (!student?.id) return;
      const active = await getStudentActiveOutpass(student.id);
      setHasActive(!!active);
      setChecking(false);
    }
    check();
  }, [student?.id]);

  function set(key: string, value: string | boolean) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === "sameDay" && value === true) next.inDate = next.outDate;
      if (key === "outDate" && next.sameDay) next.inDate = value as string;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student) return;
    if (student.isBlacklisted) {
      toast.error("You are blacklisted and cannot apply for outpass.");
      return;
    }

    setSubmitting(true);
    try {
      // Find advisor, HOD, warden
      const [advisor, hod, warden] = await Promise.all([
        getAdvisorForStudent(student.department, student.section),
        getHODForDepartment(student.department),
        getWarden(),
      ]);

      if (!advisor) { toast.error("No advisor found for your department/section."); setSubmitting(false); return; }
      if (!hod) { toast.error("No HOD found for your department."); setSubmitting(false); return; }
      if (!warden) { toast.error("No warden found."); setSubmitting(false); return; }

      const now = new Date().toISOString();
      await createOutpass({
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        registerNo: student.registerNo,
        department: student.department,
        section: student.section,
        semester: student.semester,
        year: student.year,
        roomNo: student.roomNo,
        purpose: form.purpose,
        outDate: form.outDate,
        inDate: form.sameDay ? form.outDate : form.inDate,
        timeOut: form.timeOut,
        timeIn: form.timeIn,
        status: "pending_advisor",
        advisorId: advisor.id,
        advisorName: advisor.name,
        hodId: hod.id,
        hodName: hod.name,
        wardenId: warden.id,
        wardenName: warden.name,
        createdAt: now,
        updatedAt: now,
      });

      toast.success("Outpass application submitted!");
      router.push("/student");
    } catch (err) {
      toast.error("Failed to submit. Try again.");
      console.error(err);
    }
    setSubmitting(false);
  }

  if (checking) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (hasActive) return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "rgba(245,158,11,0.1)" }}>
        <AlertTriangle size={24} className="text-yellow-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold font-display">Application in Progress</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-sm">
          You already have an active outpass application. You can apply again only after it is concluded (approved or rejected).
        </p>
      </div>
      <button onClick={() => router.push("/student")} className="btn-primary mt-2">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => router.push("/student")} className="flex items-center gap-2 text-slate-400 text-sm hover:text-white mb-6 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display">Apply for Outpass</h1>
        <p className="text-slate-400 text-sm mt-1">Fill in the details to request leave from campus</p>
      </div>

      {/* Student info preview */}
      <div className="card mb-6" style={{ background: "var(--elevated)" }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-display mb-3">Your Details</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Name", value: student?.name },
            { label: "Register No.", value: student?.registerNo },
            { label: "Department", value: student?.department },
            { label: "Section", value: student?.section },
            { label: "Year / Semester", value: `${student?.year} / ${student?.semester}` },
            { label: "Room No.", value: student?.roomNo || "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
        <div>
          <label className="label">Purpose of Leave *</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="e.g. Medical appointment, family function, emergency..."
            value={form.purpose}
            onChange={e => set("purpose", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Out Date *</label>
            <input
              type="date"
              className="input"
              min={today}
              value={form.outDate}
              onChange={e => set("outDate", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">In Date *</label>
            <input
              type="date"
              className="input"
              min={form.outDate}
              value={form.inDate}
              onChange={e => set("inDate", e.target.value)}
              disabled={form.sameDay}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sameDay"
            className="w-4 h-4 accent-blue-500"
            checked={form.sameDay}
            onChange={e => set("sameDay", e.target.checked)}
          />
          <label htmlFor="sameDay" className="text-sm text-slate-300 cursor-pointer">
            Return on the same day
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Time Out *</label>
            <input
              type="time"
              className="input"
              value={form.timeOut}
              onChange={e => set("timeOut", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Time In *</label>
            <input
              type="time"
              className="input"
              value={form.timeIn}
              onChange={e => set("timeIn", e.target.value)}
              required
            />
          </div>
        </div>

        {/* Approval path preview */}
        <div className="p-4 rounded-xl" style={{ background: "var(--elevated)", border: "1px solid var(--border)" }}>
          <p className="text-xs text-slate-400 font-display font-semibold uppercase tracking-wider mb-3">Approval Flow</p>
          <div className="flex items-center gap-2 text-sm">
            {["Class Advisor", "HOD", "Warden"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium font-display"
                  style={{ background: "rgba(92,124,250,0.1)", color: "#5c7cfa" }}>
                  {step}
                </span>
                {i < 2 && <span className="text-slate-600">→</span>}
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary justify-center py-3">
          <Send size={16} />
          {submitting ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}
