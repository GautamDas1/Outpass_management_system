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
import { format, parseISO } from "date-fns";

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
  const modeRef = useRef<ScanMode>("out");
  const resultRef = useRef<ScanResult | null>(null);

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
      setCameraError("Camera initialization failed. Please ensure permissions are granted.");
    }
  }, []);

  useEffect(() => {
    setResult(null);
    processingRef.current = false;
    if (inputMode === "camera") startCamera();
    else { stopCamera(); setTimeout(() => inputRef.current?.focus(), 150); }
    return () => stopCamera();
  }, [inputMode, startCamera, stopCamera]);

  const processQRData = useCallback(async (data: string) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanning(true);

    try {
      const payload = parseQRPayload(data.trim());
      if (!payload?.id) {
        setResult({ success: false, message: "Invalid QR format. Please use the official student app." });
        setScanning(false); processingRef.current = false; return;
      }
      const outpass = await getOutpassById(payload.id);
      if (!outpass) {
        setResult({ success: false, message: "Outpass record not found in database." });
        setScanning(false); processingRef.current = false; return;
      }
      if (outpass.status !== "approved") {
        setResult({ success: false, message: `Status: ${outpass.status.toUpperCase()}. Only approved outpasses are valid.`, outpass });
        setScanning(false); processingRef.current = false; return;
      }

      const now = new Date();
      const now_iso = now.toISOString();
      const currentMode = modeRef.current;

      if (currentMode === "out") {
        if (outpass.scannedOut) {
          setResult({ success: false, message: "This student has already scanned out.", outpass });
        } else {
          await updateOutpass(outpass.id, { scannedOut: true, scannedOutAt: now_iso });
          setResult({ success: true, message: `${outpass.studentName} is now scanned OUT`, outpass: { ...outpass, scannedOut: true } });
          toast.success("Scan-Out Successful");
        }
      } else {
        if (outpass.scannedIn) {
          setResult({ success: false, message: "This student has already scanned in.", outpass });
        } else {
          await updateOutpass(outpass.id, { scannedIn: true, scannedInAt: now_iso });
          setResult({ success: true, message: `${outpass.studentName} is now scanned IN`, outpass: { ...outpass, scannedIn: true } });
          toast.success("Scan-In Successful");
        }
      }
    } catch (err) {
      setResult({ success: false, message: "System error processing scan." });
    }
    setScanning(false);
    processingRef.current = false;
  }, []);

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

    // Normal pass
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

    // Inversion pass for dark/inverted codes
    if (!code) {
      ctx.filter = "invert(100%)";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.filter = "none";
      imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
    }

    if (code?.data) {
      if (navigator.vibrate) navigator.vibrate(100);
      processQRData(code.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [processQRData]);

  useEffect(() => {
    if (cameraActive && !result) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [cameraActive, result, scanFrame]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;
    await processQRData(qrInput.trim());
    setQrInput("");
  };

  function reset() {
    setResult(null);
    resultRef.current = null;
    setQrInput("");
    setScanning(false);
    processingRef.current = false;
    if (inputMode === "manual") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function handleLogout() { stopCamera(); await logout(); router.push("/"); }

  const modeColor = mode === "out" ? "#f59e0b" : "#22c55e";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-card" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500">
            <QrCode size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold leading-tight">Gate Scanner</p>
            <p className="text-xs text-slate-400">{gatekeeper?.name}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-4 w-full max-w-sm mx-auto">
        {/* Direction Toggle */}
        <div className="flex gap-2 p-1.5 rounded-2xl w-full bg-card border border-border">
          {(["out", "in"] as ScanMode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); reset(); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: mode === m ? (m === "out" ? "#f59e0b" : "#22c55e") : "transparent", color: mode === m ? "white" : "var(--text-secondary)" }}>
              {m === "out" ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Input Toggle */}
        <div className="flex gap-2 w-full">
          {(["camera", "manual"] as InputMode[]).map((id) => (
            <button key={id} onClick={() => setInputMode(id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm border font-medium"
              style={{ background: inputMode === id ? "rgba(92,124,250,0.1)" : "transparent", borderColor: inputMode === id ? "#5c7cfa" : "var(--border)", color: inputMode === id ? "#5c7cfa" : "var(--text-secondary)" }}>
              {id === "camera" ? <Camera size={15} /> : <Keyboard size={15} />}
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>

        {/* Scanner Content */}
        {!result && (
          <div className="w-full">
            {inputMode === "camera" ? (
              <div className="relative rounded-2xl overflow-hidden aspect-square bg-black border-2" style={{ borderColor: modeColor }}>
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} style={{ position: 'absolute', left: '-9999px' }} />
                {cameraActive && !scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-52 h-52 border-2 border-dashed rounded-lg animate-pulse" style={{ borderColor: modeColor }} />
                  </div>
                )}
                {cameraLoading && <div className="absolute inset-0 flex items-center justify-center text-white bg-black/50">Starting Camera...</div>}
                {scanning && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">Processing...</div>}
              </div>
            ) : (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 bg-card p-5 rounded-2xl border border-border">
                <div className="text-center mb-2">
                  <p className="font-bold text-lg">Manual Entry</p>
                  <p className="text-xs text-slate-400">Scan with USB device or type ID manually</p>
                </div>
                <input
                  ref={inputRef}
                  className="w-full p-4 rounded-xl bg-slate-900 border border-slate-700 text-center font-mono text-sm"
                  placeholder="Paste or Type UUID..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  autoFocus
                />
                <button 
                  type="submit" 
                  disabled={scanning || !qrInput.trim()}
                  className="w-full py-4 rounded-xl font-bold text-white transition-opacity disabled:opacity-50"
                  style={{ background: modeColor }}
                >
                  {scanning ? "Verifying..." : `Confirm ${mode.toUpperCase()}`}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Results View */}
        {result && (
          <div className="w-full bg-card p-6 rounded-3xl text-center border-2 shadow-xl" style={{ borderColor: result.success ? "#22c55e" : "#ef4444" }}>
            <div className="flex flex-col items-center gap-4">
               {result.success ? <CheckCircle2 size={64} className="text-green-500" /> : <XCircle size={64} className="text-red-500" />}
               <div>
                 <h3 className="text-2xl font-bold" style={{ color: result.success ? "#22c55e" : "#ef4444" }}>
                    {result.success ? "Verified" : "Access Denied"}
                 </h3>
                 <p className="text-slate-400 mt-1">{result.message}</p>
               </div>

               {result.outpass && (
                 <div className="w-full mt-2 bg-slate-900/50 p-4 rounded-xl text-left text-sm space-y-2">
                    <p><span className="text-slate-500">Name:</span> <span className="font-bold">{result.outpass.studentName}</span></p>
                    <p><span className="text-slate-500">Reg No:</span> {result.outpass.registerNo}</p>
                    <p><span className="text-slate-500">Purpose:</span> {result.outpass.purpose}</p>
                 </div>
               )}

               <button onClick={reset} className="w-full py-4 mt-2 bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700">
                 <RefreshCw size={18} /> Ready for Next
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}