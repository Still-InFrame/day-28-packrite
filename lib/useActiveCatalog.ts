"use client";

import { useCallback, useEffect, useState } from "react";
import type { Catalog } from "@/lib/types";

const STORAGE_KEY = "packrite.activeCatalog";

// Persists the chosen catalog across the camera and catalog screens so a capture
// always lands where the user expects. Falls back to the first catalog.
export function useActiveCatalog(catalogs: Catalog[]): [string, (id: string) => void] {
  const fallback = catalogs[0]?.id ?? "";
  const [activeId, setActiveId] = useState(fallback);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;
    if (stored && catalogs.some((c) => c.id === stored)) {
      setActiveId(stored);
    } else {
      setActiveId(fallback);
    }
  }, [catalogs, fallback]);

  const select = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  return [activeId, select];
}
