"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { getOutpassById, updateOutpass } from "@/lib/db";
import { parseQRPayload } from "@/lib/qr";
import type { Gatekeeper, OutpassForm } from "@/types";
import toast from "react-hot-toast";
import {
  QrCode, LogOut, ArrowUpRight, ArrowDownLeft,
  CheckCircle2, XCircle, RefreshCw, Camera, CameraOff, Keyboard
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
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const jsQRRef = useRef<any>(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  // Use refs for values needed inside callbacks to avoid stale closures
  const modeRef = useRef<ScanMode>("out");
  const resultRef = useRef<ScanResult | null>(null);

  // Keep refs in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { resultRef.current = result; }, [result]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!user || user.role !== "gatekeeper") router.push("/");
  }, [user, router]);

  // Load jsQR from CDN
  useEffect(() => {
    if ((window as any).jsQR) {
      jsQRRef.current = (window as any).jsQR;
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
    script.async = true;
    script.onload = () => { jsQRRef.current = (window as any).jsQR; };
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current) return;
    setCameraError(null);
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          if (video.readyState >= 3) resolve();
          else { video.oncanplay = () => { video.oncanplay = null; resolve(); }; }
        });
        if (mountedRef.current && streamRef.current) {
          await videoRef.current.play().catch((err) => { if (err.name !== "AbortError") throw err; });
        }
      }
      if (mountedRef.current) { setCameraActive(true); setCameraLoading(false); }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setCameraLoading(false);
      if (err.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Allow camera access in browser settings and refresh.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found. Switch to Manual mode.");
      } else if (err.name !== "AbortError") {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    setResult(null);
    processingRef.current = false;
    if (inputMode === "camera") startCamera();
    else { stopCamera(); setTimeout(() => inputRef.current?.focus(), 150); }
    return () => stopCamera();
  }, [inputMode]); // eslint-disable-line

  useEffect(() => () => stopCamera(), [stopCamera]);

  // processQRData defined before scanFrame so scanFrame can reference it
  const processQRData = useCallback(async (data: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanning(true);
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }

    try {
      const payload = parseQRPayload(data.trim());
      if (!payload?.id) {
        setResult({ success: false, message: "Invalid QR code. Ask the student to show their outpass QR." });
        setScanning(false); processingRef.current = false; return;
      }
      const outpass = await getOutpassById(payload.id);
      if (!outpass) {
        setResult({ success: false, message: "Outpass not found in system." });
        setScanning(false); processingRef.current = false; return;
      }
      if (outpass.status !== "approved") {
        setResult({ success: false, message: "This outpass has not been approved yet.", outpass });
        setScanning(false); processingRef.current = false; return;
      }
      const now = new Date();
      const outDate = parseISO(outpass.outDate);
      const inDate = parseISO(outpass.inDate);
      const validity = new Date(inDate);
      validity.setDate(validity.getDate() + 1);
      if (isBefore(now, outDate)) {
        setResult({ success: false, message: `Not valid yet. Valid from ${format(outDate, "dd MMM yyyy")}.`, outpass });
        setScanning(false); processingRef.current = false; return;
      }
      if (isAfter(now, validity)) {
        setResult({ success: false, message: "This outpass has expired.", outpass });
        setScanning(false); processingRef.current = false; return;
      }
      const now_iso = now.toISOString();
      // Use modeRef to get current mode (avoids stale closure)
      const currentMode = modeRef.current;
      if (currentMode === "out") {
        if (outpass.scannedOut) {
          setResult({ success: false, message: "Student has already scanned out.", outpass });
          setScanning(false); processingRef.current = false; return;
        }
        await updateOutpass(outpass.id, { scannedOut: true, scannedOutAt: now_iso });
        setResult({ success: true, message: `${outpass.studentName} scanned OUT ✓`, outpass: { ...outpass, scannedOut: true, scannedOutAt: now_iso } });
        toast.success("Scan-Out recorded!");
      } else {
        if (!outpass.scannedOut) {
          setResult({ success: false, message: "Student has not scanned out yet.", outpass });
          setScanning(false); processingRef.current = false; return;
        }
        if (outpass.scannedIn) {
          setResult({ success: false, message: "Student has already returned.", outpass });
          setScanning(false); processingRef.current = false; return;
        }
        await updateOutpass(outpass.id, { scannedIn: true, scannedInAt: now_iso });
        setResult({ success: true, message: `${outpass.studentName} scanned IN ✓`, outpass: { ...outpass, scannedIn: true, scannedInAt: now_iso } });
        toast.success("Scan-In recorded!");
      }
    } catch (err) {
      console.error("processQRData error:", err);
      setResult({ success: false, message: "Error processing QR. Please try again." });
    }
    setScanning(false);
    processingRef.current = false;
  }, []); // eslint-disable-line

  const scanFrame = useCallback(() => {
    if (processingRef.current || resultRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const jsQR = jsQRRef.current;
    if (!video || !canvas || !jsQR || video.readyState < video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth", // try both normal and inverted
    });
    if (code?.data) {
      console.log("QR detected:", code.data);
      processQRData(code.data);
      return;
    }
    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [processQRData]);

  useEffect(() => {
    if (cameraActive && !result) {
      processingRef.current = false;
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
    return () => { if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; } };
  }, [cameraActive, result, scanFrame]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qrInput.trim()) return;
    await processQRData(qrInput.trim());
    setQrInput("");
  }

  function reset() {
    setResult(null);
    resultRef.current = null;
    setQrInput("");
    setScanning(false);
    processingRef.current = false;
    if (inputMode === "camera" && cameraActive) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    } else if (inputMode === "manual") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function handleLogout() { stopCamera(); await logout(); router.push("/"); }

  const modeColor = mode === "out" ? "#f59e0b" : "#22c55e";
  const modeBorderColor = mode === "out" ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.4)";
  const modeBg = mode === "out" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
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
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-4 w-full max-w-sm mx-auto">
        {/* Mode toggle */}
        <div className="flex gap-2 p-1.5 rounded-2xl w-full" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {(["out", "in"] as ScanMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); modeRef.current = m; reset(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold font-display transition-all"
              style={{ background: mode === m ? (m === "out" ? "#f59e0b" : "#22c55e") : "transparent", color: mode === m ? "white" : "var(--text-secondary)" }}>
              {m === "out" ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
              Scan {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Input mode toggle */}
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
          <div className="w-full flex flex-col gap-3">
            <div className="relative w-full rounded-2xl overflow-hidden"
              style={{ aspectRatio: "1/1", background: "#000", border: `2px solid ${modeBorderColor}` }}>
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover"
                style={{ display: cameraActive ? "block" : "none" }} />
              <canvas ref={canvasRef} className="hidden" />
              {cameraActive && !scanning && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-52 h-52">
                    {["top-0 left-0 border-t-2 border-l-2 rounded-tl-lg", "top-0 right-0 border-t-2 border-r-2 rounded-tr-lg", "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg", "bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg"].map((cls, i) => (
                      <div key={i} className={`absolute w-8 h-8 ${cls}`} style={{ borderColor: modeColor }} />
                    ))}
                    <div className="absolute left-3 right-3 h-0.5 rounded-full animate-bounce"
                      style={{ background: modeColor, top: "50%", opacity: 0.9 }} />
                  </div>
                </div>
              )}
              {cameraActive && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
                  <span className="px-3 py-1 rounded-full text-xs font-bold font-display"
                    style={{ background: "rgba(0,0,0,0.65)", color: modeColor }}>
                    {mode === "out" ? "▲ SCAN OUT — Student Leaving" : "▼ SCAN IN — Student Returning"}
                  </span>
                </div>
              )}
              {cameraLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "var(--card)" }}>
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }} />
                  <p className="text-sm text-slate-400 font-display">Starting camera...</p>
                </div>
              )}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ background: "var(--card)" }}>
                  <CameraOff size={36} className="text-red-400" />
                  <p className="text-sm text-red-300 leading-relaxed">{cameraError}</p>
                  <button onClick={startCamera} className="btn-primary text-sm py-2 px-5"><Camera size={14} /> Try Again</button>
                </div>
              )}
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.75)" }}>
                  <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: modeColor, borderTopColor: "transparent" }} />
                  <p className="text-sm font-bold font-display" style={{ color: modeColor }}>Processing...</p>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 text-center">Point the camera at the student's QR code — it scans automatically.</p>
          </div>
        )}

        {/* Manual input */}
        {inputMode === "manual" && !result && (
          <div className="w-full">
            <div className="card text-center mb-4" style={{ borderColor: modeBorderColor, background: modeBg }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: modeBg }}>
                {mode === "out" ? <ArrowUpRight size={28} className="text-yellow-400" /> : <ArrowDownLeft size={28} className="text-green-400" />}
              </div>
              <p className="font-bold font-display">{mode === "out" ? "Student Leaving Campus" : "Student Returning to Campus"}</p>
              <p className="text-slate-400 text-sm mt-1">Use USB scanner or paste QR data below</p>
            </div>
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
              <div>
                <label className="label">QR Code Data</label>
                <input ref={inputRef} className="input font-mono text-center"
                  placeholder="Scan with USB scanner or paste here..."
                  value={qrInput} onChange={(e) => setQrInput(e.target.value)} autoFocus />
              </div>
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
            <div className="card" style={{ borderColor: result.success ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)", background: result.success ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)" }}>
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
