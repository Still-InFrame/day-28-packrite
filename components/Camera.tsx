"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Webcam from "react-webcam";
import { createClient } from "@/lib/supabase/client";
import { useActiveCatalog } from "@/lib/useActiveCatalog";
import { useMotionCapture } from "@/lib/useMotionCapture";
import { CatalogSwitcher } from "@/components/CatalogSwitcher";
import { cn } from "@/lib/cn";
import type { Catalog } from "@/lib/types";

const videoConstraints: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
};

type Saved = { id: string; path: string };

export function Camera({
  catalogs,
  userId,
}: {
  catalogs: Catalog[];
  userId: string;
}) {
  const webcamRef = useRef<Webcam>(null);
  const [activeId, setActiveId] = useActiveCatalog(catalogs);
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const [captured, setCaptured] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState(false);
  const [flash, setFlash] = useState(false);

  const [autoMode, setAutoMode] = useState(false);
  const [count, setCount] = useState(0);
  const [lastThumb, setLastThumb] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const undoTimer = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/keys")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setHasKey(d?.hasKey ?? false))
      .catch(() => setHasKey(false));
  }, []);

  // Upload + insert + kick the background catalog job. Returns the new row id +
  // storage path so auto-capture can offer an undo.
  const process = useCallback(
    async (dataUrl: string, catalogId: string): Promise<Saved | null> => {
      try {
        const supabase = createClient();
        const blob = await (await fetch(dataUrl)).blob();
        const id = crypto.randomUUID();
        const path = `${userId}/${id}.jpg`;

        const { error: upErr } = await supabase.storage
          .from("item-photos")
          .upload(path, blob, { contentType: "image/jpeg" });
        if (upErr) throw upErr;

        const { data: row, error: insErr } = await supabase
          .from("packrite_catalog_items")
          .insert({
            user_id: userId,
            catalog_id: catalogId,
            image_path: path,
            status: "pending",
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        fetch("/api/catalog", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId: row.id }),
        }).catch(() => {});

        return { id: row.id, path };
      } catch (err) {
        console.error("packrite: capture failed", err);
        return null;
      }
    },
    [userId],
  );

  const flashOnce = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
  }, []);

  // Manual shutter -> frozen preview.
  const shoot = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) return;
    setCaptured(shot);
    flashOnce();
  }, [flashOnce]);

  function keep() {
    if (!captured) return;
    const dataUrl = captured;
    const catalogId = activeId;
    setLastThumb(dataUrl);
    setCount((c) => c + 1);
    setCaptured(null);
    void process(dataUrl, catalogId);
  }

  // Auto-capture -> save immediately, surface a brief undo.
  const autoCapture = useCallback(() => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) return;
    flashOnce();
    setLastThumb(shot);
    setCount((c) => c + 1);
    process(shot, activeIdRef.current).then((s) => {
      if (!s) return;
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      setSaved(s);
      undoTimer.current = window.setTimeout(() => setSaved(null), 3200);
    });
  }, [process, flashOnce]);

  async function undo(s: Saved) {
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    setSaved(null);
    setCount((c) => Math.max(0, c - 1));
    const supabase = createClient();
    await supabase.from("packrite_catalog_items").delete().eq("id", s.id);
    await supabase.storage.from("item-photos").remove([s.path]);
  }

  const phase = useMotionCapture({
    enabled: autoMode && !captured && ready && !camError,
    getVideo: () => webcamRef.current?.video ?? null,
    onTrigger: autoCapture,
  });

  return (
    <div className="relative flex-1 overflow-hidden bg-black">
      {captured ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={captured}
          alt="Captured item"
          className="absolute inset-0 size-full object-cover"
        />
      ) : camError ? (
        <CameraError />
      ) : (
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.9}
          videoConstraints={videoConstraints}
          onUserMedia={() => setReady(true)}
          onUserMediaError={() => setCamError(true)}
          className="absolute inset-0 size-full object-cover"
        />
      )}

      {/* Auto-capture aiming frame */}
      {autoMode && !captured && !camError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "size-[68%] max-h-[60%] rounded-3xl border-2 transition-colors duration-300",
              phase === "engaging"
                ? "border-accent shadow-[0_0_0_100vmax_rgba(79,70,229,0.06)]"
                : "border-white/40",
            )}
          />
        </div>
      )}

      {/* Capture flash */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-white transition-opacity duration-150",
          flash ? "opacity-80" : "opacity-0",
        )}
      />

      {/* Top gradient + controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <CatalogSwitcher
          catalogs={catalogs}
          activeId={activeId}
          onSelect={setActiveId}
          userId={userId}
          variant="dark"
        />
        <button
          onClick={() => setAutoMode((a) => !a)}
          aria-pressed={autoMode}
          className={cn(
            "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium backdrop-blur-md transition-colors",
            autoMode
              ? "bg-accent text-white"
              : "bg-white/15 text-white hover:bg-white/25",
          )}
        >
          <AutoIcon className="size-4" />
          Auto
        </button>
      </div>

      {/* Status hint / no-key prompt */}
      {hasKey === false ? (
        <Link
          href="/settings"
          className="absolute inset-x-4 top-[4.75rem] rounded-xl bg-amber-400/95 px-4 py-3 text-sm font-medium text-amber-950 shadow-lg backdrop-blur"
        >
          Add your Anthropic API key to start cataloging →
        </Link>
      ) : autoMode && !captured ? (
        <div className="pointer-events-none absolute inset-x-0 top-[4.75rem] flex justify-center">
          <span className="rounded-full bg-black/45 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur">
            {phase === "engaging"
              ? "Hold steady…"
              : "Hold an item up — it snaps automatically"}
          </span>
        </div>
      ) : null}

      {/* Undo toast */}
      {saved && (
        <div className="absolute inset-x-0 bottom-[12rem] flex justify-center px-6">
          <div className="relative overflow-hidden rounded-full bg-zinc-900/90 shadow-lg backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <CheckIcon className="size-5 text-emerald-400" />
              <span className="text-sm font-medium text-white">Saved</span>
              <button
                onClick={() => undo(saved)}
                className="text-sm font-semibold text-indigo-300 hover:text-indigo-200"
              >
                Undo
              </button>
            </div>
            <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-shrink bg-indigo-400" />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 pb-[max(7rem,calc(env(safe-area-inset-bottom)+6.5rem))]">
        {captured ? (
          <div className="flex items-center justify-center gap-3 px-6">
            <button
              onClick={() => setCaptured(null)}
              className="h-14 flex-1 rounded-2xl bg-white/15 text-base font-semibold text-white backdrop-blur-md transition active:scale-95"
            >
              Retake
            </button>
            <button
              onClick={keep}
              className="h-14 flex-1 rounded-2xl bg-accent text-base font-semibold text-white shadow-lg transition active:scale-95"
            >
              Keep
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center px-6">
            <div className="absolute left-8">
              {lastThumb ? (
                <Link
                  href="/catalog"
                  className="relative block size-12 overflow-hidden rounded-xl border-2 border-white/70 shadow-lg"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastThumb} alt="" className="size-full object-cover" />
                  {count > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white ring-2 ring-black/30">
                      {count}
                    </span>
                  )}
                </Link>
              ) : (
                <div className="size-12" />
              )}
            </div>

            <button
              onClick={shoot}
              disabled={!ready && !camError}
              aria-label="Capture"
              className={cn(
                "group flex size-20 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40",
                autoMode ? "ring-4 ring-accent" : "ring-4 ring-white/90",
              )}
            >
              <span
                className={cn(
                  "size-16 rounded-full transition group-active:scale-90",
                  autoMode ? "bg-accent" : "bg-white",
                )}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CameraError() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-white/10">
        <svg viewBox="0 0 24 24" fill="none" className="size-7 text-white/80" aria-hidden>
          <path d="m3 3 18 18M9.5 5h5l1.5 2H19a2 2 0 0 1 2 2v8.5M5 7a2 2 0 0 0-1 1.7V18a2 2 0 0 0 2 2h11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="text-base font-medium text-white">Camera unavailable</p>
      <p className="max-w-xs text-sm text-white/60">
        Allow camera access in your browser settings, then reload. On desktop, a
        webcam is required.
      </p>
    </div>
  );
}

function AutoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
