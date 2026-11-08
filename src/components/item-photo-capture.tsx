"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FlipHorizontal, Image as ImageIcon, RefreshCw, Trash2, X } from "lucide-react";

export function ItemPhotoCapture({
  inputName = "photo",
  initialPreviewUrl,
}: {
  inputName?: string;
  initialPreviewUrl?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hiddenFormInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream utility
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera stream when isCameraActive or facingMode changes
  useEffect(() => {
    if (!isCameraActive) {
      stopCameraStream();
      return;
    }

    let isCancelled = false;
    setCameraError(null);

    async function startCamera() {
      try {
        stopCameraStream();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera not supported on this browser.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err: unknown) {
        console.error("Camera access failed:", err);
        const msg = err instanceof Error ? err.message : "Unable to access camera";
        setCameraError(msg);
      }
    }

    startCamera();

    return () => {
      isCancelled = true;
      stopCameraStream();
    };
  }, [isCameraActive, facingMode]);

  // Snap photo from live camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `item-photo-${Date.now()}.jpg`, { type: "image/jpeg" });

        // Set into hidden file input using DataTransfer
        if (hiddenFormInputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          hiddenFormInputRef.current.files = dt.files;
        }

        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setIsCameraActive(false);
      },
      "image/jpeg",
      0.9
    );
  };

  // Handle standard file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (hiddenFormInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        hiddenFormInputRef.current.files = dt.files;
      }
      setPreviewUrl(URL.createObjectURL(file));
      setIsCameraActive(false);
    }
  };

  const removePhoto = () => {
    setPreviewUrl(null);
    if (hiddenFormInputRef.current) {
      hiddenFormInputRef.current.value = "";
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsCameraActive(false);
  };

  return (
    <div className="space-y-3">
      {/* Hidden File Input submitted with form */}
      <input
        ref={hiddenFormInputRef}
        type="file"
        name={inputName}
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
      />

      {/* Hidden File Picker Input (for Gallery / File Dialog) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Live Camera Viewfinder */}
      {isCameraActive ? (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-video flex flex-col items-center justify-center shadow-lg border border-[#c3c6d7]">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {cameraError ? (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center text-white space-y-3">
              <p className="text-sm font-semibold text-rose-300">{cameraError}</p>
              <p className="text-xs text-neutral-300">
                Please grant camera permissions or use the file upload option.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-neutral-100"
              >
                Choose from Files / Gallery
              </button>
            </div>
          ) : (
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-6 px-4">
              {/* Flip camera */}
              <button
                type="button"
                onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-transform active:scale-95 shadow-md"
                title="Switch Camera"
                aria-label="Switch Camera"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/30 backdrop-blur-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-xl"
                title="Take Photo"
                aria-label="Snap Photo"
              >
                <div className="w-12 h-12 rounded-full bg-white" />
              </button>

              {/* Close camera */}
              <button
                type="button"
                onClick={() => setIsCameraActive(false)}
                className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-transform active:scale-95 shadow-md"
                title="Close Camera"
                aria-label="Close Camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : previewUrl ? (
        /* Image Preview Box */
        <div className="relative rounded-2xl overflow-hidden bg-[#eff4ff] border border-[#dee9fc] p-3 space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-white max-h-64 flex items-center justify-center">
            <img src={previewUrl} alt="Item Preview" className="max-h-64 w-full object-contain rounded-lg" />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCameraActive(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#c3c6d7] text-xs font-bold text-[#121c2a] hover:bg-neutral-50 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#004ac6]" /> Retake Photo
            </button>
            <button
              type="button"
              onClick={removePhoto}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Remove
            </button>
          </div>
        </div>
      ) : (
        /* Upload / Take Photo Buttons */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Action 1: Open In-App Camera */}
          <button
            type="button"
            onClick={() => setIsCameraActive(true)}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-[#004ac6]/40 hover:border-[#004ac6] bg-[#eff4ff]/60 hover:bg-[#eff4ff] transition-all group cursor-pointer text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[#004ac6] text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-[#004ac6]">Take Photo with Camera</p>
            <p className="text-[11px] text-[#737686] mt-0.5">Open camera viewfinder</p>
          </button>

          {/* Action 2: Choose File / Gallery */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-[#c3c6d7] hover:border-[#434655] bg-[#f8f9ff] hover:bg-white transition-all group cursor-pointer text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[#e6eeff] text-[#004ac6] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-[#121c2a]">Upload from Files / Gallery</p>
            <p className="text-[11px] text-[#737686] mt-0.5">Choose existing photo file</p>
          </button>
        </div>
      )}
    </div>
  );
}
