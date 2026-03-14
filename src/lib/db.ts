import { getSupabase } from "./supabase";
import type { Student, Staff, Gatekeeper, OutpassForm, Announcement } from "@/types";

// ─── Auto-unblacklist helper ─────────────────────────────────
async function expireBlacklists() {
  const sb = getSupabase();
  const now = new Date().toISOString();
  await sb
    .from("students")
    .update({ is_blacklisted: false, blacklist_reason: null, blacklist_until: null })
    .eq("is_blacklisted", true)
    .not("blacklist_until", "is", null)
    .lt("blacklist_until", now);
}

// ─── Row mappers ─────────────────────────────────────────────
function mapStudent(row: any): Student {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    registerNo: row.register_no,
    department: row.department,
    section: row.section,
    roomNo: row.room_no ?? "",
    year: row.year,
    semester: row.semester,
    category: row.category,
    isBlacklisted: row.is_blacklisted ?? false,
    blacklistReason: row.blacklist_reason ?? undefined,
    blacklistUntil: row.blacklist_until ?? undefined,
  } as Student & { blacklistUntil?: string };
}

function mapStaff(row: any): Staff {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    designation: row.designation,
    department: row.department,
    section: row.section ?? undefined,
  };
}

function mapGatekeeper(row: any): Gatekeeper {
  return { id: row.id, name: row.name, phone: row.phone, password: row.password };
}

function mapOutpass(row: any): OutpassForm {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    registerNo: row.register_no,
    department: row.department,
    section: row.section,
    semester: row.semester,
    year: row.year,
    roomNo: row.room_no,
    purpose: row.purpose,
    outDate: row.out_date,
    inDate: row.in_date,
    timeOut: row.time_out,
    timeIn: row.time_in,
    status: row.status,
    advisorId: row.advisor_id,
    advisorName: row.advisor_name,
    hodId: row.hod_id,
    hodName: row.hod_name,
    wardenId: row.warden_id,
    wardenName: row.warden_name,
    advisorAction: row.advisor_action,
    advisorRemark: row.advisor_remark,
    advisorActionAt: row.advisor_action_at,
    hodAction: row.hod_action,
    hodRemark: row.hod_remark,
    hodActionAt: row.hod_action_at,
    wardenAction: row.warden_action,
    wardenRemark: row.warden_remark,
    wardenActionAt: row.warden_action_at,
    qrCode: row.qr_code,
    scannedOut: row.scanned_out ?? false,
    scannedOutAt: row.scanned_out_at,
    scannedIn: row.scanned_in ?? false,
    scannedInAt: row.scanned_in_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    staffId: row.staff_id,
    staffName: row.staff_name,
    staffDesignation: row.staff_designation,
    createdAt: row.created_at,
    targetDepartment: row.target_department ?? undefined,
  };
}

// ─── Students ────────────────────────────────────────────────
export async function getStudentByEmail(email: string): Promise<Student | null> {
  await expireBlacklists();
  const sb = getSupabase();
  const { data } = await sb.from("students").select("*").eq("email", email).maybeSingle();
  return data ? mapStudent(data) : null;
}

export async function getStudentById(id: string): Promise<Student | null> {
  const sb = getSupabase();
  const { data } = await sb.from("students").select("*").eq("id", id).maybeSingle();
  return data ? mapStudent(data) : null;
}

export async function getAllStudents(): Promise<Student[]> {
  await expireBlacklists();
  const sb = getSupabase();
  const { data } = await sb.from("students").select("*").eq("category", "H").order("name");
  return (data ?? []).map(mapStudent);
}

export async function updateStudent(id: string, data: Record<string, unknown>) {
  const sb = getSupabase();
  const dbData: any = {};
  if (data.isBlacklisted !== undefined) dbData.is_blacklisted = data.isBlacklisted;
  // Convert empty string to null — Supabase timestamptz column rejects ""
  if (data.blacklistReason !== undefined)
    dbData.blacklist_reason = (data.blacklistReason === "" || data.blacklistReason === null) ? null : data.blacklistReason;
  if (data.blacklistUntil !== undefined)
    dbData.blacklist_until = (data.blacklistUntil === "" || data.blacklistUntil === null) ? null : data.blacklistUntil;
  if (data.roomNo !== undefined) dbData.room_no = data.roomNo;
  const { error } = await sb.from("students").update(dbData).eq("id", id);
  if (error) throw error;
}

export async function bulkUpsertStudents(rows: Array<Omit<Student, "id">>) {
  const sb = getSupabase();
  const dbRows = rows.map((s) => ({
    name: s.name,
    email: s.email,
    register_no: s.registerNo,
    department: s.department,
    section: s.section,
    room_no: s.roomNo,
    year: Number(s.year),
    semester: Number(s.semester),
    category: s.category,
  }));
  const { error } = await sb.from("students").upsert(dbRows, { onConflict: "email" });
  if (error) throw error;
}

// ─── Staff ───────────────────────────────────────────────────
export async function getStaffByEmail(email: string): Promise<Staff | null> {
  const sb = getSupabase();
  const { data } = await sb.from("staff").select("*").eq("email", email).maybeSingle();
  return data ? mapStaff(data) : null;
}

export async function getStaffById(id: string): Promise<Staff | null> {
  const sb = getSupabase();
  const { data } = await sb.from("staff").select("*").eq("id", id).maybeSingle();
  return data ? mapStaff(data) : null;
}

export async function getAdvisorForStudent(department: string, section: string): Promise<Staff | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("staff").select("*")
    .eq("designation", "Advisor")
    .eq("department", department)
    .eq("section", section)
    .limit(1);
  if (data && data.length > 0) return mapStaff(data[0]);
  const { data: data2 } = await sb
    .from("staff").select("*")
    .eq("designation", "Advisor")
    .eq("department", department)
    .limit(1);
  return data2 && data2.length > 0 ? mapStaff(data2[0]) : null;
}

export async function getHODForDepartment(department: string): Promise<Staff | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("staff").select("*")
    .eq("designation", "HOD")
    .eq("department", department)
    .limit(1);
  return data && data.length > 0 ? mapStaff(data[0]) : null;
}

export async function getWarden(): Promise<Staff | null> {
  const sb = getSupabase();
  const { data } = await sb.from("staff").select("*").eq("designation", "Warden").limit(1);
  return data && data.length > 0 ? mapStaff(data[0]) : null;
}

export async function bulkUpsertStaff(rows: Array<Omit<Staff, "id">>) {
  const sb = getSupabase();
  const dbRows = rows.map((s) => ({
    name: s.name,
    email: s.email,
    designation: s.designation,
    department: s.department,
    section: s.section ?? null,
  }));
  const { error } = await sb.from("staff").upsert(dbRows, { onConflict: "email" });
  if (error) throw error;
}

// ─── Gatekeepers ─────────────────────────────────────────────
export async function getGatekeeperByPhone(phone: string): Promise<Gatekeeper | null> {
  const sb = getSupabase();
  const { data } = await sb.from("gatekeepers").select("*").eq("phone", phone).maybeSingle();
  return data ? mapGatekeeper(data) : null;
}

export async function getAllGatekeepers(): Promise<Gatekeeper[]> {
  const sb = getSupabase();
  const { data } = await sb.from("gatekeepers").select("*").order("name");
  return (data ?? []).map(mapGatekeeper);
}

export async function addGatekeeper(row: Omit<Gatekeeper, "id">) {
  const sb = getSupabase();
  const { error } = await sb.from("gatekeepers").insert(row);
  if (error) throw error;
}

export async function deleteGatekeeper(id: string) {
  const sb = getSupabase();
  await sb.from("gatekeepers").delete().eq("id", id);
}

// ─── Outpass Forms ───────────────────────────────────────────
export async function createOutpass(data: Omit<OutpassForm, "id">): Promise<string> {
  const sb = getSupabase();
  const { data: row, error } = await sb
    .from("outpasses")
    .insert({
      student_id: data.studentId,
      student_name: data.studentName,
      student_email: data.studentEmail,
      register_no: data.registerNo,
      department: data.department,
      section: data.section,
      semester: data.semester,
      year: data.year,
      room_no: data.roomNo,
      purpose: data.purpose,
      out_date: data.outDate,
      in_date: data.inDate,
      time_out: data.timeOut,
      time_in: data.timeIn,
      status: data.status,
      advisor_id: data.advisorId,
      advisor_name: data.advisorName,
      hod_id: data.hodId,
      hod_name: data.hodName,
      warden_id: data.wardenId,
      warden_name: data.wardenName,
      created_at: data.createdAt,
      updated_at: data.updatedAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return row.id;
}

export async function getOutpassById(id: string): Promise<OutpassForm | null> {
  const sb = getSupabase();
  const { data } = await sb.from("outpasses").select("*").eq("id", id).maybeSingle();
  return data ? mapOutpass(data) : null;
}

export async function updateOutpass(id: string, data: Partial<OutpassForm>) {
  const sb = getSupabase();
  const dbData: any = { updated_at: new Date().toISOString() };
  const fieldMap: Record<string, string> = {
    status: "status",
    advisorAction: "advisor_action",
    advisorRemark: "advisor_remark",
    advisorActionAt: "advisor_action_at",
    hodAction: "hod_action",
    hodRemark: "hod_remark",
    hodActionAt: "hod_action_at",
    wardenAction: "warden_action",
    wardenRemark: "warden_remark",
    wardenActionAt: "warden_action_at",
    qrCode: "qr_code",
    scannedOut: "scanned_out",
    scannedOutAt: "scanned_out_at",
    scannedIn: "scanned_in",
    scannedInAt: "scanned_in_at",
  };
  for (const [key, dbKey] of Object.entries(fieldMap)) {
    if ((data as any)[key] !== undefined) dbData[dbKey] = (data as any)[key];
  }
  const { error } = await sb.from("outpasses").update(dbData).eq("id", id);
  if (error) throw error;
}

export async function getStudentActiveOutpass(studentId: string): Promise<OutpassForm | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("student_id", studentId)
    .in("status", ["pending_advisor", "pending_hod", "pending_warden"])
    .limit(1);
  return data && data.length > 0 ? mapOutpass(data[0]) : null;
}

export async function getStudentOutpasses(studentId: string): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getPendingForAdvisor(advisorId: string): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("advisor_id", advisorId)
    .eq("status", "pending_advisor")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getAllForAdvisor(advisorId: string): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("advisor_id", advisorId)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getPendingForHOD(department: string): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("department", department)
    .eq("status", "pending_hod")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getAllForHOD(department: string): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("department", department)
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getPendingForWarden(): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .eq("status", "pending_warden")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getAllOutpasses(): Promise<OutpassForm[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("outpasses").select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapOutpass);
}

export async function getStudentOutpassCountThisMonth(studentId: string): Promise<number> {
  const sb = getSupabase();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await sb
    .from("outpasses").select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "approved")
    .gte("out_date", startOfMonth.toISOString().split("T")[0]);
  return count ?? 0;
}

// ─── Announcements ───────────────────────────────────────────
export async function createAnnouncement(data: Omit<Announcement, "id">): Promise<string> {
  const sb = getSupabase();
  const { data: row, error } = await sb
    .from("announcements")
    .insert({
      title: data.title,
      message: data.message,
      staff_id: data.staffId,
      staff_name: data.staffName,
      staff_designation: data.staffDesignation,
      target_department: data.targetDepartment ?? null,
      created_at: data.createdAt,
    })
    .select("id")
    .single();
  if (error) throw error;
  return row.id;
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("announcements").select("*")
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapAnnouncement);
}

export async function deleteAnnouncement(id: string) {
  const sb = getSupabase();
  await sb.from("announcements").delete().eq("id", id);
}

// ─── Realtime subscriptions ───────────────────────────────────
export function subscribeToAnnouncements(cb: (a: Announcement[]) => void) {
  const sb = getSupabase();
  getAnnouncements().then(cb);
  const channel = sb
    .channel("announcements-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
      getAnnouncements().then(cb);
    })
    .subscribe();
  return () => { sb.removeChannel(channel); };
}

export function subscribeToOutpass(id: string, cb: (o: OutpassForm | null) => void) {
  const sb = getSupabase();
  getOutpassById(id).then(cb);
  const channel = sb
    .channel(`outpass-${id}`)
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "outpasses", filter: `id=eq.${id}`,
    }, () => { getOutpassById(id).then(cb); })
    .subscribe();
  return () => { sb.removeChannel(channel); };
}