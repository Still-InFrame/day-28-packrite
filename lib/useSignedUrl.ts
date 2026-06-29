"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Private bucket: mint short-lived signed URLs on the client. Cached per path so
// re-renders and realtime updates don't re-sign the same image repeatedly.
const cache = new Map<string, string>();
const EXPIRES = 60 * 60; // 1 hour

export function useSignedUrl(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(
    path ? (cache.get(path) ?? null) : null,
  );

  useEffect(() => {
    if (!path) return;
    const cached = cache.get(path);
    if (cached) {
      setUrl(cached);
      return;
    }
    let active = true;
    createClient()
      .storage.from("item-photos")
      .createSignedUrl(path, EXPIRES)
      .then(({ data }) => {
        if (data?.signedUrl && active) {
          cache.set(path, data.signedUrl);
          setUrl(data.signedUrl);
        }
      });
    return () => {
      active = false;
    };
  }, [path]);

  return url;
}
