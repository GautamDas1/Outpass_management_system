import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, rows } = body as { type: "students" | "staff"; rows: any[] };

    if (!type || !rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const sb = createAdminClient();

    if (type === "students") {
      // Validate required columns
      const required = ["name", "email", "register_no", "department", "section", "year", "semester", "category"];
      const sample = rows[0];
      const missing = required.filter((k) => !(k in sample));
      if (missing.length > 0) {
        return NextResponse.json({ error: `Missing columns: ${missing.join(", ")}` }, { status: 400 });
      }

      const dbRows = rows
        .filter((r) => r.category?.toUpperCase() === "H") // Only hostellers
        .map((r) => ({
          name: String(r.name).trim(),
          email: String(r.email).trim().toLowerCase(),
          register_no: String(r.register_no).trim().toUpperCase(),
          department: String(r.department).trim(),
          section: String(r.section).trim().toUpperCase(),
          room_no: r.room_no ? String(r.room_no).trim() : null,
          year: Number(r.year),
          semester: Number(r.semester),
          category: "H",
          is_blacklisted: false,
        }));

      if (dbRows.length === 0) {
        return NextResponse.json({ error: "No hosteller (category=H) rows found in CSV." }, { status: 400 });
      }

      const { error, count } = await sb
        .from("students")
        .upsert(dbRows, { onConflict: "email", ignoreDuplicates: false });

      if (error) throw error;
      return NextResponse.json({ success: true, upserted: dbRows.length, skipped: rows.length - dbRows.length });
    }

    if (type === "staff") {
      const required = ["name", "email", "designation", "department"];
      const sample = rows[0];
      const missing = required.filter((k) => !(k in sample));
      if (missing.length > 0) {
        return NextResponse.json({ error: `Missing columns: ${missing.join(", ")}` }, { status: 400 });
      }

      const validDesignations = ["Advisor", "HOD", "Warden"];
      const dbRows = rows
        .filter((r) => validDesignations.includes(String(r.designation).trim()))
        .map((r) => ({
          name: String(r.name).trim(),
          email: String(r.email).trim().toLowerCase(),
          designation: String(r.designation).trim() as "Advisor" | "HOD" | "Warden",
          department: String(r.department).trim(),
          section: r.section ? String(r.section).trim().toUpperCase() : null,
        }));

      if (dbRows.length === 0) {
        return NextResponse.json({ error: "No valid staff rows found. Designation must be Advisor, HOD, or Warden." }, { status: 400 });
      }

      const { error } = await sb
        .from("staff")
        .upsert(dbRows, { onConflict: "email", ignoreDuplicates: false });

      if (error) throw error;

      // For each new staff member, create a Supabase Auth account with a temp password
      // so they can log in. We'll invite them.
      const authResults: { email: string; status: string }[] = [];
      for (const row of dbRows) {
        // Try to create auth user — if exists, skip
        const { error: inviteErr } = await sb.auth.admin.inviteUserByEmail(row.email, {
          data: { full_name: row.name },
        });
        authResults.push({
          email: row.email,
          status: inviteErr ? `already exists or ${inviteErr.message}` : "invite sent",
        });
      }

      return NextResponse.json({
        success: true,
        upserted: dbRows.length,
        skipped: rows.length - dbRows.length,
        authInvites: authResults,
      });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err: any) {
    console.error("CSV upload error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
