"use client";
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { getSupabase } from "@/lib/supabase";
import { getStudentByEmail, getStaffByEmail, getGatekeeperByPhone } from "@/lib/db";
import type { AuthUser, Gatekeeper } from "@/types";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInStudentGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInStaffGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInGatekeeper: (phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);
const GOOGLE_LOGIN_TYPE_KEY = "google_login_type";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [gatekeeperSession, setGatekeeperSession] = useState<Gatekeeper | null>(null);
  const resolvingRef = useRef(false); // prevent concurrent resolves

  useEffect(() => {
    // ── Restore gatekeeper session ──────────────────────────────
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("gk_session");
      if (saved) {
        try {
          const gk: Gatekeeper = JSON.parse(saved);
          setGatekeeperSession(gk);
          setUser({ uid: gk.id, email: `gk_${gk.phone}@internal`, displayName: gk.name, role: "gatekeeper", profileData: gk });
          setLoading(false);
          return;
        } catch { sessionStorage.removeItem("gk_session"); }
      }
    }

    const sb = getSupabase();

    // ── Use onAuthStateChange ONLY — no getSession() call ───────
    // INITIAL_SESSION always fires first on page load with current state
    // SIGNED_IN fires after actual login (not on page load with existing session)
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email ?? "no user");

      // Only handle these events
      if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Prevent concurrent resolves (INITIAL_SESSION + SIGNED_IN firing together)
      if (resolvingRef.current) return;
      resolvingRef.current = true;

      await resolveGoogleUser(session.user.email!, session.user.id, session.user.user_metadata);
      setLoading(false);
      resolvingRef.current = false;
    });

    return () => subscription.unsubscribe();
  }, []);

  async function resolveGoogleUser(email: string, uid: string, meta: any) {
    const loginType = typeof window !== "undefined" ? sessionStorage.getItem(GOOGLE_LOGIN_TYPE_KEY) : null;
    console.log("Resolving:", email, "loginType:", loginType);

    try {
      // Staff tab login
      if (loginType === "staff") {
        const staff = await getStaffByEmail(email);
        if (staff) {
          const role = staff.designation === "Advisor" ? "advisor" : staff.designation === "HOD" ? "hod" : "warden";
          setUser({ uid, email, displayName: meta?.full_name || meta?.name || staff.name, photoURL: meta?.avatar_url || meta?.picture || undefined, role, profileData: staff });
          sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
          return;
        }
        await getSupabase().auth.signOut();
        setUser(null);
        sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
        window.dispatchEvent(new CustomEvent("outpass-auth-error", { detail: "Email not registered as staff." }));
        return;
      }

      // Student tab login (loginType === "student" or null — handles page refresh)
      const student = await getStudentByEmail(email);
      if (student) {
        if (student.category !== "H") {
          await getSupabase().auth.signOut();
          setUser(null);
          window.dispatchEvent(new CustomEvent("outpass-auth-error", { detail: "Day scholars cannot access this system." }));
          return;
        }
        setUser({ uid, email, displayName: meta?.full_name || meta?.name || student.name, photoURL: meta?.avatar_url || meta?.picture || undefined, role: "student", profileData: student });
        sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
        return;
      }

      // Not a student — try staff (handles null loginType after page refresh for staff)
      const staff = await getStaffByEmail(email);
      if (staff) {
        const role = staff.designation === "Advisor" ? "advisor" : staff.designation === "HOD" ? "hod" : "warden";
        setUser({ uid, email, displayName: meta?.full_name || meta?.name || staff.name, photoURL: meta?.avatar_url || meta?.picture || undefined, role, profileData: staff });
        sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
        return;
      }

      // Not in any table
      await getSupabase().auth.signOut();
      setUser(null);
      window.dispatchEvent(new CustomEvent("outpass-auth-error", { detail: "Email not registered. Contact your admin." }));
    } catch (err) {
      console.error("resolveGoogleUser error:", err);
      setUser(null);
    }
  }

  async function signInStudentGoogle() {
    sessionStorage.setItem(GOOGLE_LOGIN_TYPE_KEY, "student");
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function signInStaffGoogle() {
    sessionStorage.setItem(GOOGLE_LOGIN_TYPE_KEY, "staff");
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function signInGatekeeper(phone: string, password: string) {
    try {
      const trimmedPhone = phone.trim();
      const trimmedPass = password.trim();
      if (!trimmedPhone || !trimmedPass) return { success: false, error: "Enter both phone and password." };
      const gk = await getGatekeeperByPhone(trimmedPhone);
      if (!gk) return { success: false, error: "Phone number not found. Contact the warden." };
      if (gk.password !== trimmedPass) return { success: false, error: "Wrong password." };
      sessionStorage.setItem("gk_session", JSON.stringify(gk));
      setGatekeeperSession(gk);
      setUser({ uid: gk.id, email: `gk_${gk.phone}@internal`, displayName: gk.name, role: "gatekeeper", profileData: gk });
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Login failed. Try again." };
    }
  }

  async function logout() {
    sessionStorage.removeItem("gk_session");
    sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
    setGatekeeperSession(null);
    setUser(null);
    const { data: { session } } = await getSupabase().auth.getSession();
    if (session) await getSupabase().auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInStudentGoogle, signInStaffGoogle, signInGatekeeper, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
