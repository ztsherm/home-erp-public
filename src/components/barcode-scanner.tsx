"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  Barcode,
  Camera,
  CheckCircle2,
  Flashlight,
  Loader2,
  Play,
  QrCode,
  RefreshCw,
  SwitchCamera,
  X,
} from "lucide-react";

const buttonClass =
  "grid h-10 w-10 shrink-0 place-items-center rounded-md border border-neutral-300 bg-white text-neutral-700 hover:bg-stone-50 transition-colors";

export const supportedBarcodeFormats = [
  "aztec",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "data_matrix",
  "ean_13",
  "ean_8",
  "itf",
  "pdf417",
  "qr_code",
  "upc_a",
  "upc_e",
];

export type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

/**
 * Embedded camera scanner viewport designed for continuous scanning in the Assistant UI.
 */
export function EmbeddedCameraScanner({
  onScan,
  targetType = "all",
  isProcessing = false,
  autoStart = true,
}: {
  onScan: (value: string) => void;
  targetType?: "all" | "item" | "area";
  isProcessing?: boolean;
  autoStart?: boolean;
}) {
  const [isActive, setIsActive] = useState(autoStart);
  const [error, setError] = useState("");
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isLockedRef = useRef(false);

  // Check camera devices
  useEffect(() => {
    async function checkDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoInputs.length > 1);
      } catch {
        // Ignore enumeration errors
      }
    }
    void checkDevices();
  }, []);

  const handleDetectedCode = useCallback(
    (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || isLockedRef.current || isProcessing) return;

      isLockedRef.current = true;
      setScannedFeedback(code);

      // Play short haptic pulse if supported
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(100);
        } catch {
          // Ignore vibration failure
        }
      }

      onScan(code);

      // Reset lock after delay in case page didn't navigate immediately
      setTimeout(() => {
        isLockedRef.current = false;
      }, 2500);
    },
    [onScan, isProcessing]
  );

  // Initialize and run the live camera stream + detector
  useEffect(() => {
    if (!isActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let cancelled = false;
    let frameId = 0;
    let detector: InstanceType<BarcodeDetectorConstructor> | null = null;

    async function startCamera() {
      setError("");
      setScannedFeedback(null);
      isLockedRef.current = false;

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera hardware access is not available in this browser or environment.");
        }

        if (!window.BarcodeDetector) {
          throw new Error(
            "Barcode scanning API is not supported in this browser. Please enter the barcode manually below."
          );
        }

        detector = new window.BarcodeDetector({ formats: supportedBarcodeFormats });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = (videoTrack.getCapabilities?.() as { torch?: boolean }) || {};
          setHasTorch(Boolean(capabilities.torch));
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((err) => {
            console.warn("Video play interrupted:", err);
          });
        }

        // Active continuous detection loop
        const detectFrame = async () => {
          if (cancelled || !videoRef.current || !detector || isLockedRef.current || isProcessing) {
            if (!cancelled && isActive) {
              frameId = window.requestAnimationFrame(detectFrame);
            }
            return;
          }

          try {
            if (videoRef.current.readyState >= 2) {
              const detected = await detector.detect(videoRef.current);
              if (detected.length > 0 && detected[0]?.rawValue) {
                handleDetectedCode(detected[0].rawValue);
                return;
              }
            }
          } catch {
            // Ignore single-frame detection errors
          }

          frameId = window.requestAnimationFrame(detectFrame);
        };

        frameId = window.requestAnimationFrame(detectFrame);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to access camera.");
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isActive, facingMode, handleDetectedCode, isProcessing]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch {
      // Ignore torch toggle error
    }
  };

  const isArea = targetType === "area";
  const promptText = isArea
    ? "Point camera at Area QR code or shelf barcode"
    : targetType === "item"
    ? "Point camera at product barcode or UPC"
    : "Point camera at barcode or QR code";

  return (
    <div className="relative rounded-3xl overflow-hidden bg-[#0d141e] text-white shadow-xl border border-neutral-800">
      {/* Video Viewport */}
      <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-black flex items-center justify-center overflow-hidden">
        {isActive && !error ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}

        {/* Viewfinder Reticle & Laser */}
        {isActive && !error ? (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {/* Viewfinder Target Box */}
            <div className="relative w-60 h-44 sm:w-72 sm:h-48 border-2 border-white/40 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all">
              {/* Glowing Corners */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#3b82f6] rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#3b82f6] rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#3b82f6] rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#3b82f6] rounded-br-lg" />

              {/* Central Target Icon */}
              {isArea ? (
                <QrCode className="w-16 h-16 text-white/25" />
              ) : (
                <Barcode className="w-20 h-20 text-white/25" />
              )}

              {/* Scanning Laser Beam */}
              {!isProcessing && !scannedFeedback ? (
                <div className="absolute inset-x-2 h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
              ) : null}

              {/* Scanned Confirmation Overlay */}
              {scannedFeedback ? (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center p-3 text-center animate-in fade-in zoom-in duration-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-1" />
                  <p className="text-xs font-bold text-emerald-200">Scanned!</p>
                  <p className="text-[11px] font-mono text-emerald-100 truncate max-w-[200px]">
                    {scannedFeedback}
                  </p>
                  {isProcessing ? (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Resolving...</span>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Camera Inactive State */}
        {!isActive && !error ? (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white/70">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-white/90">Camera is Paused</p>
            <button
              type="button"
              onClick={() => setIsActive(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Scanner
            </button>
          </div>
        ) : null}

        {/* Camera Error / Fallback State */}
        {error ? (
          <div className="p-6 text-center max-w-sm z-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-950/60 text-red-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-300">Camera Unavailable</p>
              <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">{error}</p>
            </div>
            <div className="pt-1 flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsActive(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Camera
              </button>
            </div>

            {/* Quick manual entry within error box */}
            <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Enter barcode or code manually"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manualCode.trim()) {
                    e.preventDefault();
                    handleDetectedCode(manualCode);
                  }
                }}
                className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualCode.trim()) handleDetectedCode(manualCode);
                }}
                disabled={!manualCode.trim()}
                className="px-3 py-1.5 bg-[#2563eb] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all"
              >
                Go
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Viewfinder Controls & Info Bar */}
      <div className="p-4 bg-[#121c2a] flex items-center justify-between gap-3 border-t border-white/10">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white/90 truncate">{promptText}</p>
          <p className="text-[10px] text-white/50 truncate">
            {isActive
              ? isProcessing
                ? "Searching catalog..."
                : "Scanning actively in real-time"
              : "Scanner paused"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Torch Toggle */}
          {hasTorch && isActive && !error ? (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl text-xs transition-colors ${
                torchOn ? "bg-amber-400 text-black font-bold" : "bg-white/10 text-white hover:bg-white/20"
              }`}
              title="Toggle flashlight"
              aria-label="Toggle flashlight"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          ) : null}

          {/* Switch Camera */}
          {hasMultipleCameras && isActive && !error ? (
            <button
              type="button"
              onClick={() =>
                setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
              }
              className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs transition-colors"
              title="Switch camera"
              aria-label="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          ) : null}

          {/* Pause / Resume Button */}
          {!error ? (
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              {isActive ? "Pause" : "Resume"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact modal camera scan button used in forms and ERP workflows.
 */
export function CameraScanButton({
  onScan,
  label = "Scan barcode",
}: Readonly<{ onScan: (value: string) => void; label?: string }>) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [manualValue, setManualValue] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let frame = 0;
    let detector: InstanceType<BarcodeDetectorConstructor> | null = null;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera access is not available in this browser.");
        }
        if (!window.BarcodeDetector) {
          throw new Error("Barcode scanning is not supported in this browser. Enter the code manually.");
        }
        detector = new window.BarcodeDetector({ formats: supportedBarcodeFormats });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const scan = async () => {
          if (cancelled || !videoRef.current || !detector) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              const value = codes[0]?.rawValue?.trim();
              if (value) {
                onScan(value);
                setOpen(false);
                return;
              }
            }
          } catch {
            // continue detection
          }
          frame = window.requestAnimationFrame(scan);
        };
        frame = window.requestAnimationFrame(scan);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to start barcode scanning.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [onScan, open]);

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          setError("");
          setManualValue("");
          setOpen(true);
        }}
        aria-label={label}
        title={label}
      >
        <Camera className="h-4 w-4" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 backdrop-blur-xs p-3 sm:place-items-center animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl border border-neutral-200">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-neutral-950">{label}</h2>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
                onClick={() => setOpen(false)}
                aria-label="Close scanner"
                title="Close scanner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error ? (
              <p className="mb-3 text-xs font-medium text-red-700 bg-red-50 p-2.5 rounded-lg">
                {error}
              </p>
            ) : (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-x-4 h-0.5 bg-red-500 top-1/2 shadow-[0_0_8px_red] animate-pulse" />
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <input
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                placeholder="Enter code manually"
                className="min-h-10 min-w-0 flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs outline-none focus:border-neutral-950 focus:bg-white transition-all"
              />
              <button
                type="button"
                className="rounded-xl bg-neutral-950 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition-colors"
                onClick={() => {
                  const value = manualValue.trim();
                  if (value) {
                    onScan(value);
                    setOpen(false);
                  }
                }}
              >
                Use
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
