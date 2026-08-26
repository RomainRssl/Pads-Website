"use client";

import { useEffect, useState } from "react";
import { LMU_TRACKS } from "@/lib/tracks";

export type TrackGroup = { group: string; options: string[] };

export const CUSTOM_GROUP_LABEL = "Circuits ajoutés";

/**
 * Groupes de circuits pour les selects admin : liste statique LMU
 * + circuits ajoutés manuellement via /admin/circuits (groupe "Circuits ajoutés",
 * inséré avant "Mystère").
 */
export function useTrackGroups(): TrackGroup[] {
  const [custom, setCustom] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/custom-tracks")
      .then((r) => (r.ok ? r.json() : []))
      .then((names: string[]) => setCustom(Array.isArray(names) ? names : []))
      .catch(() => {});
  }, []);

  return mergeCustomTracks(custom);
}

export function mergeCustomTracks(custom: string[]): TrackGroup[] {
  if (custom.length === 0) return LMU_TRACKS;
  const groups = LMU_TRACKS.filter((g) => g.group !== "Mystère");
  const mystery = LMU_TRACKS.filter((g) => g.group === "Mystère");
  return [...groups, { group: CUSTOM_GROUP_LABEL, options: custom }, ...mystery];
}
