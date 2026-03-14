"use client";
import { useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Users, UserCheck, ChevronDown, ChevronUp, RefreshCw, X,
  Download
} from "lucide-react";

type UploadType = "students" | "staff";

interface ParsedRow {
  [key: string]: string;
}

interface ValidationResult {
  valid: ParsedRow[];
  invalid: { row: ParsedRow; errors: string[] }[];
}

const STUDENT_REQUIRED = ["name", "email", "register_no", "department", "section", "year", "semester", "category"];
const STAFF_REQUIRED = ["name", "email", "designation", "department"];

const STUDENT_TEMPLATE = `name,email,register_no,department,section,year,semester,room_no,category
Arun Kumar,arun.kumar@college.edu,21CS001,Computer Science,A,3,5,A-101,H
Priya Sharma,priya.sharma@college.edu,21CS002,Computer Science,A,3,5,B-204,H`;

const STAFF_TEMPLATE = `name,email,designation,department,section
Dr. Meena Pillai,meena.pillai@college.edu,Advisor,Computer Science,A
Dr. Anitha Krishnan,anitha.krishnan@college.edu,HOD,Computer Science,
Mr. Siva Raman,siva.raman@college.edu,Warden,Administration,`;

function validateRows(rows: ParsedRow[], type: UploadType): ValidationResult {
  const required = type === "students" ? STUDENT_REQUIRED : STAFF_REQUIRED;
  const valid: ParsedRow[] = [];
  const invalid: { row: ParsedRow; errors: string[] }[] = [];

  rows.forEach((row) => {
    const errors: string[] = [];
    required.forEach((field) => {
      if (!row[field]?.trim()) errors.push(`Missing: ${field}`);
    });
    if (type === "students") {
      if (row.category && !["H", "D"].includes(row.category.toUpperCase())) {
        errors.push("category must be H or D");
      }
      if (row.year && isNaN(Number(row.year))) errors.push("year must be a number");
      if (row.semester && isNaN(Number(row.semester))) errors.push("semester must be a number");
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("invalid email");
    }
    if (type === "staff") {
      const validDesig = ["Advisor", "HOD", "Warden"];
      if (row.designation && !validDesig.includes(row.designation.trim())) {
        errors.push("designation must be Advisor, HOD, or Warden");
      }
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("invalid email");
    }
    if (errors.length > 0) invalid.push({ row, errors });
    else valid.push(row);
  });

  return { valid, invalid };
}

export default function HODUploadPage() {
  const [activeTab, setActiveTab] = useState<UploadType>("students");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setParsedRows([]);
    setFileName("");
    setValidation(null);
    setUploadResult(null);
    setShowPreview(false);
    setShowErrors(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    setUploadResult(null);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: (results) => {
        const rows = results.data as ParsedRow[];
        setParsedRows(rows);
        const v = validateRows(rows, activeTab);
        setValidation(v);
        if (v.invalid.length > 0) {
          toast.error(`${v.invalid.length} row(s) have errors — review before uploading`);
        } else {
          toast.success(`${rows.length} rows parsed successfully`);
        }
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }

  async function handleUpload() {
    if (!validation || validation.valid.length === 0) return;
    setUploading(true);
    try {
      const res = await fetch("/api/upload-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: activeTab, rows: validation.valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadResult(data);
      toast.success(`${data.upserted} records uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
    setUploading(false);
  }

  function downloadTemplate(type: UploadType) {
    const content = type === "students" ? STUDENT_TEMPLATE : STAFF_TEMPLATE;
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display">CSV Data Upload</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload student or staff records from your college CSV files
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {(["students", "staff"] as UploadType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); reset(); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold font-display capitalize transition-all"
            style={{
              background: activeTab === t ? "var(--brand)" : "transparent",
              color: activeTab === t ? "white" : "var(--text-secondary)",
            }}
          >
            {t === "students" ? <Users size={15} /> : <UserCheck size={15} />}
            {t === "students" ? "Students CSV" : "Staff CSV"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: instructions + template */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 className="font-bold font-display mb-3 flex items-center gap-2">
              <FileText size={16} style={{ color: "var(--brand)" }} />
              Required Columns
            </h3>
            <div className="flex flex-col gap-1">
              {(activeTab === "students" ? STUDENT_REQUIRED : STAFF_REQUIRED).map((col) => (
                <div key={col} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand)" }} />
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "var(--elevated)", color: "#748ffc" }}>
                    {col}
                  </code>
                  {(activeTab === "students" ? ["name", "email", "register_no", "department", "section", "year", "semester", "category"] : ["name", "email", "designation", "department"]).includes(col) && (
                    <span className="text-xs text-red-400">*required</span>
                  )}
                </div>
              ))}
              {activeTab === "students" && (
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 opacity-40" style={{ background: "var(--brand)" }} />
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "var(--elevated)", color: "#748ffc" }}>room_no</code>
                  <span className="text-xs text-slate-500">optional</span>
                </div>
              )}
            </div>

            {activeTab === "students" && (
              <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--elevated)" }}>
                <p className="font-semibold text-slate-300 mb-1">⚠️ Note on category:</p>
                <p className="text-slate-400">Only rows with <code className="text-yellow-400">category=H</code> (Hostellers) will be imported. Day scholars (D) are skipped.</p>
              </div>
            )}
            {activeTab === "staff" && (
              <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: "var(--elevated)" }}>
                <p className="font-semibold text-slate-300 mb-1">⚠️ Designation values:</p>
                <p className="text-slate-400">Must be exactly: <code className="text-yellow-400">Advisor</code>, <code className="text-yellow-400">HOD</code>, or <code className="text-yellow-400">Warden</code></p>
                <p className="text-slate-400 mt-1">Staff will receive email invites to set their password.</p>
              </div>
            )}
          </div>

          <button
            onClick={() => downloadTemplate(activeTab)}
            className="btn-secondary justify-center gap-2"
          >
            <Download size={15} />
            Download {activeTab === "students" ? "Student" : "Staff"} Template
          </button>
        </div>

        {/* Right: upload area + results */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Drop zone */}
          <div
            className="card flex flex-col items-center justify-center gap-4 py-10 cursor-pointer transition-all"
            style={{ borderStyle: "dashed", borderColor: fileName ? "var(--brand)" : "var(--border)" }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(92,124,250,0.1)" }}>
              <Upload size={26} style={{ color: "var(--brand)" }} />
            </div>
            {fileName ? (
              <div className="text-center">
                <p className="font-semibold font-display text-brand-400">{fileName}</p>
                <p className="text-slate-400 text-sm mt-1">{parsedRows.length} rows parsed</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="font-semibold font-display">Click to select CSV file</p>
                <p className="text-slate-400 text-sm mt-1">or drag and drop your file here</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Validation summary */}
          {validation && (
            <div className="card flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold font-display">Validation Results</h3>
                <button onClick={reset} className="text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg text-center" style={{ background: "var(--elevated)" }}>
                  <p className="text-xl font-bold font-display">{parsedRows.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Total rows</p>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: "rgba(34,197,94,0.05)" }}>
                  <p className="text-xl font-bold font-display text-green-400">{validation.valid.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Valid</p>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ background: validation.invalid.length > 0 ? "rgba(239,68,68,0.05)" : "transparent" }}>
                  <p className={`text-xl font-bold font-display ${validation.invalid.length > 0 ? "text-red-400" : "text-slate-500"}`}>
                    {validation.invalid.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Errors</p>
                </div>
              </div>

              {/* Error list */}
              {validation.invalid.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="flex items-center gap-2 text-red-400 text-sm font-medium hover:text-red-300 transition-colors"
                  >
                    <AlertTriangle size={14} />
                    {showErrors ? "Hide" : "Show"} {validation.invalid.length} error row{validation.invalid.length !== 1 ? "s" : ""}
                    {showErrors ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showErrors && (
                    <div className="mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto">
                      {validation.invalid.map((item, i) => (
                        <div key={i} className="p-3 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                          <p className="font-medium text-slate-300 mb-1">
                            Row {i + 1}: {item.row.name || item.row.email || "(unnamed)"}
                          </p>
                          {item.errors.map((e, j) => (
                            <p key={j} className="text-red-400">• {e}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview table */}
              {validation.valid.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {showPreview ? "Hide" : "Preview"} valid rows
                  </button>
                  {showPreview && (
                    <div className="mt-2 overflow-x-auto rounded-lg border" style={{ borderColor: "var(--border)" }}>
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: "var(--elevated)" }}>
                            {columns.map((col) => (
                              <th key={col} className="text-left px-3 py-2 text-slate-400 font-display font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validation.valid.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                              {columns.map((col) => (
                                <td key={col} className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-[120px] truncate">
                                  {row[col] || "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {validation.valid.length > 10 && (
                            <tr className="border-t" style={{ borderColor: "var(--border)" }}>
                              <td colSpan={columns.length} className="px-3 py-2 text-slate-500 text-center">
                                + {validation.valid.length - 10} more rows...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Upload button */}
              {validation.valid.length > 0 && !uploadResult && (
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary justify-center py-3"
                >
                  {uploading ? (
                    <><RefreshCw size={16} className="animate-spin" /> Uploading {validation.valid.length} rows...</>
                  ) : (
                    <><Upload size={16} /> Upload {validation.valid.length} valid {activeTab === "students" ? "students" : "staff"}</>
                  )}
                </button>
              )}

              {/* Success result */}
              {uploadResult && (
                <div className="p-4 rounded-xl flex flex-col gap-3"
                  style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="flex items-center gap-2 text-green-400 font-bold font-display">
                    <CheckCircle2 size={18} />
                    Upload Successful
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg" style={{ background: "var(--elevated)" }}>
                      <p className="text-2xl font-bold font-display text-green-400">{uploadResult.upserted}</p>
                      <p className="text-xs text-slate-400">Records added/updated</p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: "var(--elevated)" }}>
                      <p className="text-2xl font-bold font-display text-slate-400">{uploadResult.skipped ?? 0}</p>
                      <p className="text-xs text-slate-400">Skipped (day scholars/invalid)</p>
                    </div>
                  </div>
                  {uploadResult.authInvites && (
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-2">Email Invites Sent:</p>
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
                        {uploadResult.authInvites.map((inv: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded"
                            style={{ background: "var(--elevated)" }}>
                            <span className="text-slate-300">{inv.email}</span>
                            <span className={inv.status === "invite sent" ? "text-green-400" : "text-yellow-400"}>
                              {inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={reset} className="btn-secondary justify-center">
                    Upload another file
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
