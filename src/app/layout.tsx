import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "OutPass — Digital Outpass Management",
  description: "Streamlined outpass management for college hostellers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e2535",
                color: "#f1f5f9",
                border: "1px solid #2a3347",
                fontFamily: "'DM Sans', sans-serif",
              },
              success: { iconTheme: { primary: "#22c55e", secondary: "#1e2535" } },
              error: { iconTheme: { primary: "#ef4444", secondary: "#1e2535" } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
