"use client";

import { useEffect, useRef, useState } from "react";

// Lightweight, model-free auto-capture: watch the camera for an item being
// brought into frame and held still, then fire once. Works for ANY item
// (clothing included) since it keys on motion, not object classes.
//
// State machine, sampled ~8x/sec on a 64x48 grayscale frame:
//   idle      -> motion rises (item moving in)        -> engaging
//   engaging  -> motion stays low for STEADY_TICKS    -> fire(), -> cooldown
//   cooldown  -> motion rises again (item removed)     -> engaging (re-armed)
// Requiring a fresh "rise" before re-arming stops it from re-snapping a
// still item, giving a natural hold-up / move-away rhythm.

export type MotionPhase = "off" | "idle" | "engaging" | "cooldown";

interface Opts {
  enabled: boolean;
  getVideo: () => HTMLVideoElement | null;
  onTrigger: () => void;
}

const W = 64;
const H = 48;
const INTERVAL = 120; // ms between samples
const MOTION_HIGH = 9; // avg per-pixel grayscale delta = "moving"
const MOTION_LOW = 4; // below this = "steady"
const STEADY_TICKS = 5; // ~0.6s held still before firing

export function useMotionCapture({
  enabled,
  getVideo,
  onTrigger,
}: Opts): MotionPhase {
  const [phase, setPhase] = useState<MotionPhase>("off");

  // Keep latest callbacks in refs so the sampling loop never resubscribes.
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;
  const getVideoRef = useRef(getVideo);
  getVideoRef.current = getVideo;

  useEffect(() => {
    if (!enabled) {
      setPhase("off");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let prev: Float32Array | null = null;
    let state: MotionPhase = "idle";
    let steady = 0;
    setPhase("idle");

    const setState = (s: MotionPhase) => {
      if (s !== state) {
        state = s;
        setPhase(s);
      }
    };

    const id = window.setInterval(() => {
      const video = getVideoRef.current();
      if (!ctx || !video || video.readyState < 2 || video.videoWidth === 0) {
        return;
      }
      ctx.drawImage(video, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      const gray = new Float32Array(W * H);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        gray[p] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      }

      if (prev) {
        let sum = 0;
        for (let p = 0; p < gray.length; p++) sum += Math.abs(gray[p] - prev[p]);
        const motion = sum / gray.length;

        if (state === "idle") {
          if (motion > MOTION_HIGH) setState("engaging");
        } else if (state === "engaging") {
          if (motion < MOTION_LOW) {
            steady += 1;
            if (steady >= STEADY_TICKS) {
              steady = 0;
              setState("cooldown");
              triggerRef.current();
            }
          } else {
            steady = 0;
          }
        } else if (state === "cooldown") {
          if (motion > MOTION_HIGH) setState("engaging");
        }
      }
      prev = gray;
    }, INTERVAL);

    return () => window.clearInterval(id);
  }, [enabled]);

  return phase;
}
