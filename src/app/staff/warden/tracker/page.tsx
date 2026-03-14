"use client";
import { useEffect, useState } from "react";
import { getAllOutpasses } from "@/lib/db";
import type { OutpassForm } from "@/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Users, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default function WardenTracker() {
  const [outpasses, setOutpasses] = useState<OutpassForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    getAllOutpasses().then(data => {
      setOutpasses(data.filter(o => o.status === "approved"));
      setLoading(false);
    });
  }, []);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDay = startOfMonth(currentMonth).getDay();

  function getOutpassesForDay(date: Date) {
    return outpasses.filter(op => {
      const out = parseISO(op.outDate);
      const inn = parseISO(op.inDate);
      return date >= out && date <= inn;
    });
  }

  function getSelectedOutpasses() {
    if (!selectedDate) return [];
    return getOutpassesForDay(selectedDate);
  }

  function prevMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const selectedOps = getSelectedOutpasses();

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Student Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">Calendar view of students outside campus</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold font-display text-lg">{format(currentMonth, "MMMM yyyy")}</h2>
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-700 transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-700 transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
              <div key={d} className="text-center text-xs text-slate-500 font-display font-semibold py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {days.map(day => {
              const ops = getOutpassesForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className="relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all"
                  style={{
                    background: isSelected ? "var(--brand)" : isToday ? "rgba(92,124,250,0.1)" : "transparent",
                    color: isSelected ? "white" : isToday ? "var(--brand)" : "var(--text-primary)",
                    fontWeight: isToday || isSelected ? "600" : "400",
                  }}
                >
                  {format(day, "d")}
                  {ops.length > 0 && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{ background: isSelected ? "white" : "#f59e0b" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day details */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(92,124,250,0.1)" }}>
              <Users size={18} style={{ color: "var(--brand)" }} />
            </div>
            <div>
              <h3 className="font-bold font-display">
                {selectedDate ? format(selectedDate, "dd MMMM yyyy") : "Select a date"}
              </h3>
              <p className="text-xs text-slate-400">{selectedOps.length} student{selectedOps.length !== 1 ? "s" : ""} outside</p>
            </div>
          </div>

          {selectedOps.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {selectedDate ? "No students outside on this day." : "Select a date to view students."}
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {selectedOps.map(op => (
                <div key={op.id} className="p-3 rounded-lg" style={{ background: "var(--elevated)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{op.studentName}</p>
                      <p className="text-xs text-slate-500">{op.registerNo} · {op.department}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{op.purpose}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {op.scannedOut ? (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#f59e0b" }}>
                          <ArrowUpRight size={11} /> Out {op.scannedOutAt ? format(parseISO(op.scannedOutAt), "h:mm a") : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Not yet out</span>
                      )}
                      {op.scannedIn ? (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <ArrowDownLeft size={11} /> Returned {op.scannedInAt ? format(parseISO(op.scannedInAt), "h:mm a") : ""}
                        </span>
                      ) : op.scannedOut ? (
                        <span className="text-xs text-red-400">Not returned</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Currently outside - live list */}
      <div className="card">
        <h2 className="font-bold font-display mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Currently Outside Campus
        </h2>
        {(() => {
          const outside = outpasses.filter(o => o.scannedOut && !o.scannedIn);
          if (outside.length === 0) return <p className="text-slate-400 text-sm text-center py-4">No students currently outside.</p>;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                    {["Student","Reg No","Department","Out At","Due Back","Status"].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs text-slate-500 font-display font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outside.map(op => {
                    const dueBack = new Date(`${op.inDate}T${op.timeIn}`);
                    const isLate = new Date() > dueBack;
                    return (
                      <tr key={op.id} className="border-b transition-colors hover:bg-slate-800/30" style={{ borderColor: "var(--border)" }}>
                        <td className="py-3 px-3 font-medium">{op.studentName}</td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-xs">{op.registerNo}</td>
                        <td className="py-3 px-3 text-slate-400">{op.department}</td>
                        <td className="py-3 px-3 text-slate-400">{op.scannedOutAt ? format(parseISO(op.scannedOutAt), "h:mm a") : "—"}</td>
                        <td className="py-3 px-3 text-slate-400">{format(new Date(op.inDate), "dd MMM")} {op.timeIn}</td>
                        <td className="py-3 px-3">
                          <span className={`badge ${isLate ? "badge-rejected" : "badge-pending"}`}>
                            {isLate ? "Overdue" : "On Time"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
