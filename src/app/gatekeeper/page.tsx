"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getOutpassById, updateOutpass } from "@/lib/db";
import { parseQRPayload } from "@/lib/qr";
import type { Gatekeeper, OutpassForm } from "@/types";
import toast from "react-hot-toast";
import {
  QrCode, LogOut, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, RefreshCw, Camera, Keyboard
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";

type ScanMode = "out" | "in";
type InputMode = "camera" | "manual";
type ScanResult = { success: boolean; outpass?: OutpassForm; message: string };

export default function GatekeeperPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const gatekeeper = user?.profileData as Gatekeeper;

  const [mode, setMode] = useState<ScanMode>("out");
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [qrInput, setQrInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const html5QrRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<ScanMode>("out");
  const processingRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    if (!user || user.role !== "gatekeeper") router.push("/");
  }, [user, router]);

  // Load html5-qrcode script once
  useEffect(() => {
    if ((window as any).Html5Qrcode) {
      if (inputMode === "camera") startCamera();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
    script.async = true;
    script.onload = () => {
      if (inputMode === "camera") startCamera();
    };
    document.head.appendChild(script);
    return () => {
      stopCamera();
    };
  }, []); // eslint-disable-line

  async function startCamera() {
    if (startedRef.current) return;
    const Html5Qrcode = (window as any).Html5Qrcode;
    if (!Html5Qrcode) return;

    setCameraError(null);
    setCameraReady(false);
    startedRef.current = true;

    try {
      // Clean up any previous instance
      if (html5QrRef.current) {
        await html5QrRef.current.stop().catch(() => {});
        html5QrRef.current = null;
      }

      // Clear the div to prevent duplicate camera views on restart
      const readerEl = document.getElementById("qr-reader");
      if (readerEl) readerEl.innerHTML = "";

      html5QrRef.current = new Html5Qrcode("qr-reader", { verbose: false });

      await html5QrRef.current.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        onScanSuccess,
        () => {}
      );

      setCameraReady(true);

      // Hide extra UI that html5-qrcode injects (file upload, select camera button etc.)
      setTimeout(() => {
        const reader = document.getElementById("qr-reader");
        if (!reader) return;
        // Hide all children except the video element
        Array.from(reader.children).forEach((child: any) => {
          const tag = child.tagName?.toLowerCase();
          if (tag !== "video" && !child.id?.includes("scan_region")) {
            // Keep only the scan region div and video
            if (!child.querySelector?.("video")) {
              child.style.display = "none";
            }
          }
        });
        // Also hide the file input and bottom bar
        const selects = reader.querySelectorAll("select, input[type=file], #qr-reader__dashboard, #qr-reader__header_message, #qr-reader__status_span");
        selects.forEach((el: any) => el.style.display = "none");
      }, 500);

    } catch (err: any) {
      startedRef.current = false;
      if (err?.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Allow camera access and refresh.");
      } else {
        setCameraError("Camera failed. Use Manual mode instead.");
      }
    }
  }

  function stopCamera() {
    startedRef.current = false;
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
      setCameraReady(false);
    }
  }

  async function stopCameraAsync() {
    startedRef.current = false;
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      html5QrRef.current = null;
      setCameraReady(false);
    }
  }

  useEffect(() => {
    setResult(null);
    processingRef.current = false;
    if (inputMode === "camera") {
      startedRef.current = false;
      if ((window as any).Html5Qrcode) startCamera();
    } else {
      stopCamera();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    return () => stopCamera();
  }, [inputMode]); // eslint-disable-line

  async function onScanSuccess(decodedText: string) {
    if (processingRef.current) return;
    processingRef.current = true;
    if (html5QrRef.current) html5QrRef.current.pause(true);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    await processQRData(decodedText);
    processingRef.current = false;
  }

  async function processQRData(data: string) {
    setScanning(true);
    try {
      const payload = parseQRPayload(data.trim());
      if (!payload?.id) {
        setResult({ success: false, message: "Invalid QR code. Ask the student to show their outpass QR." });
        setScanning(false); return;
      }
      const outpass = await getOutpassById(payload.id);
      if (!outpass) {
        setResult({ success: false, message: "Outpass not found in system." });
        setScanning(false); return;
      }
      if (outpass.status !== "approved") {
        setResult({ success: false, message: "This outpass has not been approved yet.", outpass });
        setScanning(false); return;
      }
      const now = new Date();
      const outDate = parseISO(outpass.outDate);
      const inDate = parseISO(outpass.inDate);
      const validity = new Date(inDate);
      validity.setDate(validity.getDate() + 1);
      if (isBefore(now, outDate)) {
        setResult({ success: false, message: `Not valid yet. Valid from ${format(outDate, "dd MMM yyyy")}.`, outpass });
        setScanning(false); return;
      }
      if (isAfter(now, validity)) {
        setResult({ success: false, message: "This outpass has expired.", outpass });
        setScanning(false); return;
      }
      const now_iso = now.toISOString();
      const currentMode = modeRef.current;
      if (currentMode === "out") {
        if (outpass.scannedOut) {
          setResult({ success: false, message: "Student has already scanned out.", outpass });
        } else {
          await updateOutpass(outpass.id, { scannedOut: true, scannedOutAt: now_iso });
          setResult({ success: true, message: `${outpass.studentName} scanned OUT ✓`, outpass: { ...outpass, scannedOut: true, scannedOutAt: now_iso } });
          toast.success("Scan-Out recorded!");
        }
      } else {
        if (!outpass.scannedOut) {
          setResult({ success: false, message: "Student has not scanned out yet.", outpass });
        } else if (outpass.scannedIn) {
          setResult({ success: false, message: "Student has already returned.", outpass });
        } else {
          await updateOutpass(outpass.id, { scannedIn: true, scannedInAt: now_iso });
          setResult({ success: true, message: `${outpass.studentName} scanned IN ✓`, outpass: { ...outpass, scannedIn: true, scannedInAt: now_iso } });
          toast.success("Scan-In recorded!");
        }
      }
    } catch (err) {
      setResult({ success: false, message: "Error processing QR. Please try again." });
    }
    setScanning(false);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    await processQRData(qrInput.trim());
    setQrInput("");
  }

  async function reset() {
    setResult(null);
    processingRef.current = false;

    if (inputMode === "camera") {
      // Fully stop and restart camera — resume() is unreliable after pause
      await stopCameraAsync();
      startedRef.current = false;
      // Small delay so DOM clears before restarting
      setTimeout(() => {
        if ((window as any).Html5Qrcode) startCamera();
      }, 300);
    } else {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function handleLogout() {
    stopCamera();
    await logout();
    router.push("/");
  }

  const modeColor = mode === "out" ? "#f59e0b" : "#22c55e";
  const modeBorderColor = mode === "out" ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.4)";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #5c7cfa, #748ffc)" }}>
            <QrCode size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold font-display leading-tight">Gate Scanner</p>
            <p className="text-xs text-slate-400">{gatekeeper?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-4 w-full max-w-sm mx-auto">

        {/* Scan OUT / IN */}
        <div className="flex gap-2 p-1.5 rounded-2xl w-full"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {(["out", "in"] as ScanMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); modeRef.current = m; }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold font-display transition-all"
              style={{ background: mode === m ? (m === "out" ? "#f59e0b" : "#22c55e") : "transparent", color: mode === m ? "white" : "var(--text-secondary)" }}>
              {m === "out" ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
              Scan {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Camera / Manual */}
        <div className="flex gap-2 w-full">
          {([{ id: "camera" as InputMode, label: "Camera", icon: Camera }, { id: "manual" as InputMode, label: "Manual / USB", icon: Keyboard }]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setInputMode(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium font-display transition-all border"
              style={{ background: inputMode === id ? "rgba(92,124,250,0.12)" : "transparent", borderColor: inputMode === id ? "var(--brand)" : "var(--border)", color: inputMode === id ? "var(--brand)" : "var(--text-secondary)" }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Camera view */}
        {inputMode === "camera" && !result && (
          <div className="w-full flex flex-col gap-2">
            {/* Inject global CSS to hide html5-qrcode extra UI */}
            <style>{`
              #qr-reader__dashboard { display: none !important; }
              #qr-reader__header_message { display: none !important; }
              #qr-reader__status_span { display: none !important; }
              #qr-reader__camera_selection { display: none !important; }
              #qr-reader__filescan_input { display: none !important; }
              #qr-reader select { display: none !important; }
              #qr-reader button:not([title="Stop Scanning"]) { display: none !important; }
              #qr-reader img { display: none !important; }
              #qr-reader { border: none !important; padding: 0 !important; }
              #qr-reader__scan_region { border-radius: 12px; overflow: hidden; }
              #qr-reader__scan_region img { display: none !important; }
            `}</style>

            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden"
              style={{ border: `2px solid ${modeBorderColor}` }} />

            {cameraError && (
              <div className="p-3 rounded-xl text-sm text-red-400 text-center"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {cameraError}
              </div>
            )}
            {scanning && (
              <p className="text-center text-sm text-slate-400 animate-pulse">Processing QR...</p>
            )}
            <div className="text-center py-2 px-4 rounded-full text-xs font-bold font-display mx-auto"
              style={{ background: modeBorderColor, color: modeColor }}>
              {mode === "out" ? "▲ SCAN OUT — Student Leaving" : "▼ SCAN IN — Student Returning"}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Point camera at student's QR code — scans automatically
            </p>
          </div>
        )}

        {/* Manual */}
        {inputMode === "manual" && !result && (
          <div className="w-full">
            <div className="card text-center mb-4" style={{ borderColor: modeBorderColor }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: mode === "out" ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)" }}>
                {mode === "out" ? <ArrowUpRight size={28} className="text-yellow-400" /> : <ArrowDownLeft size={28} className="text-green-400" />}
              </div>
              <p className="font-bold font-display">{mode === "out" ? "Student Leaving Campus" : "Student Returning"}</p>
              <p className="text-slate-400 text-sm mt-1">USB scanner or paste QR data</p>
            </div>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
              <input ref={inputRef} className="input font-mono text-center"
                placeholder="Scan with USB or paste here..."
                value={qrInput} onChange={(e) => setQrInput(e.target.value)} autoFocus />
              <button type="submit" disabled={scanning || !qrInput.trim()}
                className="btn-primary w-full justify-center py-3" style={{ background: modeColor }}>
                <QrCode size={16} />
                {scanning ? "Processing..." : `Confirm ${mode === "out" ? "Exit" : "Entry"}`}
              </button>
            </form>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="w-full">
            <div className="card"
              style={{ borderColor: result.success ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)", background: result.success ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)" }}>
              <div className="flex items-center gap-3 mb-3">
                {result.success ? <CheckCircle2 size={26} className="text-green-400 shrink-0" /> : <XCircle size={26} className="text-red-400 shrink-0" />}
                <p className="font-bold font-display text-lg" style={{ color: result.success ? "#22c55e" : "#ef4444" }}>
                  {result.success ? "Success" : "Failed"}
                </p>
              </div>
              <p className="text-sm font-medium mb-4">{result.message}</p>
              {result.outpass && (
                <div className="rounded-lg p-3 flex flex-col gap-1.5 mb-4 text-sm" style={{ background: "var(--elevated)" }}>
                  {[
                    { label: "Student", value: result.outpass.studentName },
                    { label: "Reg No.", value: result.outpass.registerNo },
                    { label: "Dept", value: result.outpass.department },
                    { label: "Purpose", value: result.outpass.purpose },
                    { label: "Valid", value: `${format(parseISO(result.outpass.outDate), "dd MMM")} – ${format(parseISO(result.outpass.inDate), "dd MMM yyyy")}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="text-slate-400 shrink-0">{label}</span>
                      <span className="font-medium text-right truncate">{value}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={reset} className="btn-secondary w-full justify-center">
                <RefreshCw size={15} /> Scan Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
