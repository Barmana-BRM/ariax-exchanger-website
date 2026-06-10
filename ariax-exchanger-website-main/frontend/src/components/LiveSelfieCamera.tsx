import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, Upload, Video } from "lucide-react";
import { KYC_IMAGE_ACCEPT } from "../utils/kycAttachments";
import { canvasToKycJpegFile } from "../utils/cameraCapture";

interface LiveSelfieCameraProps {
  onCapture: (file: File, previewUrl: string) => void;
  onClear: () => void;
  capturedPreview?: string;
  disabled?: boolean;
}

export default function LiveSelfieCamera({
  onCapture,
  onClear,
  capturedPreview = "",
  disabled = false,
}: LiveSelfieCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setCameraReady(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;

    video.srcObject = stream;
    setCameraReady(false);

    const onReady = () => {
      void video.play()
        .then(() => setCameraReady(true))
        .catch(() => setCameraError("پخش تصویر دوربین ناموفق بود"));
    };

    video.addEventListener("loadedmetadata", onReady);
    if (video.readyState >= 1) onReady();

    return () => {
      video.removeEventListener("loadedmetadata", onReady);
    };
  }, [cameraOn]);

  async function startCamera() {
    if (disabled || capturedPreview) return;
    setCameraError("");
    setStarting(true);
    stopCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("مرورگر شما از دوربین پشتیبانی نمی‌کند. از گزینه آپلود استفاده کنید.");
      setStarting(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "دسترسی به دوربین رد شد. در تنظیمات مرورگر اجازه دوربین را فعال کنید."
          : "دوربین در دسترس نیست. از گزینه آپلود فایل استفاده کنید.";
      setCameraError(message);
    } finally {
      setStarting(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    if (!video || !cameraOn || !cameraReady || disabled) {
      if (cameraOn && !cameraReady) setCameraError("لطفاً چند لحظه صبر کنید تا تصویر دوربین آماده شود.");
      return;
    }

    setCapturing(true);
    setCameraError("");
    try {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) throw new Error("تصویر دوربین هنوز آماده نیست");

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("خطا در پردازش تصویر");

      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, width, height);

      const filename = `selfie-live-${Date.now()}.jpg`;
      const file = await canvasToKycJpegFile(canvas, filename);
      const preview = URL.createObjectURL(file);
      stopCamera();
      onCapture(file, preview);
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "ثبت سلفی ناموفق بود");
    } finally {
      setCapturing(false);
    }
  }

  function handleRetake() {
    onClear();
    setCameraError("");
    void startCamera();
  }

  function handleFileUpload(file: File | null) {
    if (!file || disabled) return;
    const preview = URL.createObjectURL(file);
    stopCamera();
    onCapture(file, preview);
  }

  const showLiveFeed = cameraOn && !capturedPreview;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden">
        {capturedPreview ? (
          <div className="relative">
            <img
              src={capturedPreview}
              alt="سلفی ثبت‌شده"
              className="w-full max-h-72 object-contain bg-black"
            />
            <div className="absolute top-3 left-3 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] font-semibold text-slate-950">
              سلفی ثبت شد
            </div>
          </div>
        ) : (
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)] ${showLiveFeed && cameraReady ? "opacity-100" : "opacity-0"}`}
            />
            {showLiveFeed && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                در حال آماده‌سازی دوربین...
              </div>
            )}
            {!showLiveFeed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <Video size={28} />
                </div>
                <p className="text-sm text-slate-300">برای احراز هویت زنده، دوربین را روشن کنید</p>
                <p className="text-[11px] text-slate-500">سلفی باید همراه با کارت ملی و در همان لحظه گرفته شود</p>
              </div>
            )}
            {showLiveFeed && cameraReady && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-36 rounded-[40%] border-2 border-dashed border-emerald-400/50" />
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-center text-[11px] text-slate-300">
                  کارت ملی را کنار صورت نگه دارید و مستقیم به دوربین نگاه کنید
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {cameraError && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
          {cameraError}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!capturedPreview && !cameraOn && (
          <button
            type="button"
            disabled={disabled || starting}
            onClick={() => void startCamera()}
            className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:opacity-50"
          >
            <Camera size={16} />
            {starting ? "در حال روشن کردن..." : "روشن کردن دوربین"}
          </button>
        )}

        {showLiveFeed && (
          <button
            type="button"
            disabled={disabled || capturing || !cameraReady}
            onClick={() => void capturePhoto()}
            className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            <Camera size={16} />
            {capturing ? "در حال ثبت..." : "گرفتن سلفی"}
          </button>
        )}

        {capturedPreview && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleRetake}
            className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 transition-colors hover:border-slate-600"
          >
            <RefreshCw size={16} />
            عکس مجدد
          </button>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 transition-colors hover:border-slate-600"
        >
          <Upload size={16} />
          آپلود فایل
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={KYC_IMAGE_ACCEPT}
          className="hidden"
          onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}
