"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  useEffect(() => {
    // Restore gatekeeper session
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
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event, session?.user?.email ?? "no user");
      if (event === "INITIAL_SESSION") {
        if (!session?.user) { setLoading(false); return; }
        await resolveGoogleUser(session.user.email!, session.user.id, session.user.user_metadata);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_IN") {
        if (!session?.user) return;
        await resolveGoogleUser(session.user.email!, session.user.id, session.user.user_metadata);
        setLoading(false);
        return;
      }
      if (event === "SIGNED_OUT") { setUser(null); setLoading(false); return; }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function resolveGoogleUser(email: string, uid: string, meta: any) {
    const loginType = typeof window !== "undefined" ? sessionStorage.getItem(GOOGLE_LOGIN_TYPE_KEY) : null;
    console.log("Resolving Google user:", email, "tab:", loginType);
    try {
      // Always check staff first if loginType is "staff"
      if (loginType === "staff") {
        const staff = await getStaffByEmail(email);
        if (staff) {
          const role = staff.designation === "Advisor" ? "advisor" : staff.designation === "HOD" ? "hod" : "warden";
          setUser({ uid, email, displayName: meta?.full_name || meta?.name || staff.name, photoURL: meta?.avatar_url || meta?.picture || undefined, role, profileData: staff });
          if (typeof window !== "undefined") sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
          return;
        }
        await getSupabase().auth.signOut();
        setUser(null);
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
          window.dispatchEvent(new CustomEvent("outpass-auth-error", { detail: "This email is not registered as staff." }));
        }
        return;
      }

      // Check student
      const student = await getStudentByEmail(email);
      if (student) {
        if (student.category !== "H") {
          await getSupabase().auth.signOut();
          setUser(null);
          if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("outpass-auth-error", { detail: "Day scholars cannot access the hostel outpass system." }));
          return;
        }
        setUser({ uid, email, displayName: meta?.full_name || meta?.name || student.name, photoURL: meta?.avatar_url || meta?.picture || undefined, role: "student", profileData: student });
        if (typeof window !== "undefined") sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
        return;
      }

      // Check staff (handles null loginType — existing sessions / page refresh)
      const staff = await getStaffByEmail(email);
      if (staff) {
        const role = staff.designation === "Advisor" ? "advisor" : staff.designation === "HOD" ? "hod" : "warden";
        setUser({ uid, email, displayName: meta?.full_name || meta?.name || staff.name, photoURL: meta?.avatar_url || meta?.picture || undefined, role, profileData: staff });
        if (typeof window !== "undefined") sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
        return;
      }

      // Not in any table
      await getSupabase().auth.signOut();
      setUser(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY);
        window.dispatchEvent(new CustomEvent("outpass-auth-error", { detail: "Your email is not registered in the system. Contact your admin." }));
      }
    } catch (err) {
      console.error("resolveGoogleUser error:", err);
      setUser(null);
    }
  }

  async function signInStudentGoogle() {
    if (typeof window !== "undefined") sessionStorage.setItem(GOOGLE_LOGIN_TYPE_KEY, "student");
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" } } });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function signInStaffGoogle() {
    if (typeof window !== "undefined") sessionStorage.setItem(GOOGLE_LOGIN_TYPE_KEY, "staff");
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { access_type: "offline", prompt: "consent" } } });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async function signInGatekeeper(phone: string, password: string) {
    try {
      const trimmedPhone = phone.trim();
      const trimmedPass = password.trim();
      if (!trimmedPhone || !trimmedPass) return { success: false, error: "Please enter both phone number and password." };
      const gk = await getGatekeeperByPhone(trimmedPhone);
      if (!gk) return { success: false, error: "Phone number not found. Contact the warden." };
      if (gk.password !== trimmedPass) return { success: false, error: "Wrong password. Contact the warden if you forgot it." };
      if (typeof window !== "undefined") sessionStorage.setItem("gk_session", JSON.stringify(gk));
      setGatekeeperSession(gk);
      setUser({ uid: gk.id, email: `gk_${gk.phone}@internal`, displayName: gk.name, role: "gatekeeper", profileData: gk });
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: "Login failed. Try again." };
    }
  }

  async function logout() {
    if (typeof window !== "undefined") { sessionStorage.removeItem("gk_session"); sessionStorage.removeItem(GOOGLE_LOGIN_TYPE_KEY); }
    setGatekeeperSession(null);
    setUser(null);
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    if (session) await sb.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInStudentGoogle, signInStaffGoogle, signInGatekeeper, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
