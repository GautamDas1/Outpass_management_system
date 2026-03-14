"use client";
import { useAuth } from "@/hooks/useAuth";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Clock, Bell, LogOut,
  Users, Calendar, UserX, QrCode, Menu, X, ChevronRight, Upload
} from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function getNavItems(): NavItem[] {
    switch (user?.role) {
      case "student":
        return [
          { label: "Dashboard", icon: LayoutDashboard, href: "/student" },
          { label: "Apply Outpass", icon: FileText, href: "/student/apply" },
          { label: "My Outpasses", icon: Clock, href: "/student/history" },
          { label: "Announcements", icon: Bell, href: "/student/announcements" },
        ];
      case "advisor":
        return [
          { label: "Dashboard", icon: LayoutDashboard, href: "/staff/advisor" },
          { label: "Applications", icon: FileText, href: "/staff/advisor/applications" },
          { label: "History", icon: Clock, href: "/staff/advisor/history" },
          { label: "Announcements", icon: Bell, href: "/staff/advisor/announcements" },
        ];
      case "hod":
        return [
          { label: "Dashboard", icon: LayoutDashboard, href: "/staff/hod" },
          { label: "Applications", icon: FileText, href: "/staff/hod/applications" },
          { label: "History", icon: Clock, href: "/staff/hod/history" },
          { label: "Upload CSV", icon: Upload, href: "/staff/hod/upload" },
          { label: "Announcements", icon: Bell, href: "/staff/hod/announcements" },
        ];
      case "warden":
        return [
          { label: "Dashboard", icon: LayoutDashboard, href: "/staff/warden" },
          { label: "Applications", icon: FileText, href: "/staff/warden/applications" },
          { label: "History", icon: Clock, href: "/staff/warden/history" },
          { label: "Students Out", icon: Calendar, href: "/staff/warden/tracker" },
          { label: "Blacklist", icon: UserX, href: "/staff/warden/blacklist" },
          { label: "Gatekeepers", icon: Users, href: "/staff/warden/gatekeepers" },
          { label: "Announcements", icon: Bell, href: "/staff/warden/announcements" },
        ];
      case "gatekeeper":
        return [
          { label: "Scan QR", icon: QrCode, href: "/gatekeeper" },
        ];
      default:
        return [];
    }
  }

  const navItems = getNavItems();

  function roleLabel() {
    switch (user?.role) {
      case "student": return "Student";
      case "advisor": return "Class Advisor";
      case "hod": return "Head of Department";
      case "warden": return "Warden";
      case "gatekeeper": return "Gatekeeper";
      default: return "";
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #5c7cfa, #748ffc)" }}>
            <FileText size={16} className="text-white" />
          </div>
          <span className="font-bold font-display text-lg">OutPass</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <p className="text-xs font-semibold font-display text-slate-600 uppercase tracking-wider px-3 mb-2 mt-2">
          {roleLabel()}
        </p>
        {navItems.map(({ label, icon: Icon, href }) => {
          const active = pathname === href;
          return (
            <button
              key={href}
              onClick={() => { router.push(href); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-all text-left"
              style={{
                background: active ? "rgba(92,124,250,0.12)" : "transparent",
                color: active ? "var(--brand)" : "var(--text-secondary)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Icon size={17} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 p-3 rounded-lg mb-2"
          style={{ background: "var(--elevated)" }}>
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="avatar" width={32} height={32} className="rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: "var(--brand)", color: "white" }}>
              {user?.displayName?.[0] || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen border-r"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #5c7cfa, #748ffc)" }}>
            <FileText size={14} className="text-white" />
          </div>
          <span className="font-bold font-display">OutPass</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 text-slate-400">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
