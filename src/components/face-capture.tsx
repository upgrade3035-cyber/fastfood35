import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScanFace, X } from "lucide-react";
import {
  cameraSupported,
  descriptorFromVideo,
  loadFaceApi,
  startCamera,
  stopCamera,
} from "@/lib/face-recognition";

type Props = {
  open: boolean;
  mode: "enroll" | "login";
  title?: string;
  onClose: () => void;
  onCaptured: (descriptor: number[]) => Promise<void> | void;
};

const SAMPLES = 3;

/** Kamerani ochib, yuzni skanerlaydigan oyna */
export function FaceCapture({ open, mode, title, onClose, onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const [status, setStatus] = useState("Kamera tayyorlanmoqda...");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const finish = useCallback(
    async (descriptor: number[]) => {
      setStatus("Saqlanmoqda...");
      try {
        await onCaptured(descriptor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
        busyRef.current = false;
        return;
      }
    },
    [onCaptured],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const collected: number[][] = [];
    busyRef.current = false;
    setError(null);
    setReady(false);
    setProgress(0);
    setStatus("Kamera tayyorlanmoqda...");

    (async () => {
      if (!cameraSupported()) {
        setError("Bu qurilmada kamera mavjud emas");
        return;
      }
      try {
        const video = videoRef.current;
        if (!video) return;
        streamRef.current = await startCamera(video);
        if (cancelled) return;
        setStatus("Modellar yuklanmoqda...");
        await loadFaceApi();
        if (cancelled) return;
        setReady(true);
        setStatus("Yuzingizni ramka ichida ushlab turing");
        void scan();
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Kameraga ruxsat berilmadi"
            : "Kamerani ochib bo‘lmadi",
        );
      }
    })();

    async function scan() {
      if (cancelled || busyRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        timer = setTimeout(scan, 400);
        return;
      }
      let descriptor: number[] | null = null;
      try {
        descriptor = await descriptorFromVideo(video);
      } catch {
        descriptor = null;
      }
      if (cancelled) return;

      if (!descriptor) {
        setStatus("Yuz topilmadi — kameraga qarang");
        timer = setTimeout(scan, 500);
        return;
      }

      if (mode === "login") {
        busyRef.current = true;
        setStatus("Yuz aniqlandi, tekshirilmoqda...");
        await finish(descriptor);
        return;
      }

      collected.push(descriptor);
      setProgress(collected.length);
      setStatus(`Yuz olinmoqda (${collected.length}/${SAMPLES})`);
      if (collected.length >= SAMPLES) {
        busyRef.current = true;
        const avg = collected[0]!.map(
          (_, i) => collected.reduce((s, d) => s + (d[i] ?? 0), 0) / collected.length,
        );
        await finish(avg);
        return;
      }
      timer = setTimeout(scan, 600);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stopCamera(streamRef.current);
      streamRef.current = null;
    };
  }, [open, mode, finish]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur">
      <div className="w-full max-w-sm rounded-[2rem] glass-strong p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-foreground">
            <ScanFace className="h-4 w-4 text-primary" />
            {title ?? (mode === "enroll" ? "Yuzni saqlash" : "Face ID bilan kirish")}
          </p>
          <button
            aria-label="Yopish"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground press"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-3xl bg-secondary">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full scale-x-[-1] object-cover"
          />
          <div className="pointer-events-none absolute inset-6 rounded-[2rem] border-2 border-primary/70" />
          {!ready && !error ? (
            <div className="absolute inset-0 grid place-items-center bg-background/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        {mode === "enroll" ? (
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: SAMPLES }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i < progress ? "gradient-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        ) : null}

        <p
          className={`mt-3 text-center text-xs font-semibold ${
            error ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {error ?? status}
        </p>
      </div>
    </div>
  );
}
