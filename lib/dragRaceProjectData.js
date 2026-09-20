/**
 * lib/dragRaceProjectData.js
 *
 * Shared data-loading logic for the Drag Race project root (/drag-race).
 * Lists valid seasons directly from the normalized franchises/seasons
 * relationship - never inferred from `looks`.
 */

import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Fetch every season across every franchise, ordered by franchise then by
 * season number descending within each franchise.
 *
 * @returns {Promise<Array<{franchiseSlug, franchiseName, seasonNumber}>>}
 */
export async function getAvailableSeasons() {
  const { data, error } = await supabaseAdmin
    .from("seasons")
    .select("season_number, franchises(slug, name)")
    .order("season_number", { ascending: false });

  if (error || !data) {
    console.error("[dragRaceProjectData] Error fetching seasons:", error);
    return [];
  }

  const seasons = data
    .filter((row) => row.franchises && row.franchises.slug)
    .map((row) => ({
      franchiseSlug: row.franchises.slug,
      franchiseName: row.franchises.name,
      seasonNumber: row.season_number,
    }));

  // Group by franchise (alphabetical by slug), then season number descending within franchise
  seasons.sort((a, b) => {
    const franchiseCmp = a.franchiseSlug.localeCompare(b.franchiseSlug);
    if (franchiseCmp !== 0) return franchiseCmp;
    return b.seasonNumber - a.seasonNumber;
  });

  return seasons;
}
