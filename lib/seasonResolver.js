/**
 * seasonResolver.js
 * 
 * Server-side helper to dynamically resolve season context from database.
 * Takes franchiseSlug and seasonNumber as inputs; resolves UUIDs from Supabase.
 * 
 * No hardcoded UUIDs. Follows existing supabaseAdmin patterns.
 */

import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Resolve a season's full context by franchise slug and season number.
 * 
 * @param {string} franchiseSlug - e.g., "us"
 * @param {number} seasonNumber - e.g., 18
 * @returns {Promise<Object>} Season context with franchiseId, seasonId, etc.
 * @throws {Error} If franchise or season not found
 */
export async function resolveSeasonContext(franchiseSlug, seasonNumber) {
  // Step 1: Look up franchise by slug
  const { data: franchiseData, error: franchiseError } = await supabaseAdmin
    .from("franchises")
    .select("franchise_id, name, slug")
    .eq("slug", franchiseSlug)
    .single();

  if (franchiseError) {
    throw new Error(
      `[seasonResolver] Failed to resolve franchise "${franchiseSlug}": ${franchiseError.message}`
    );
  }

  if (!franchiseData) {
    throw new Error(
      `[seasonResolver] Franchise not found for slug: "${franchiseSlug}"`
    );
  }

  // Step 2: Look up season by franchise_id + season_number
  const { data: seasonData, error: seasonError } = await supabaseAdmin
    .from("seasons")
    .select("season_id, franchise_id, season_number, premiere_date")
    .eq("franchise_id", franchiseData.franchise_id)
    .eq("season_number", seasonNumber)
    .single();

  if (seasonError) {
    throw new Error(
      `[seasonResolver] Failed to resolve season ${seasonNumber} for franchise "${franchiseSlug}": ${seasonError.message}`
    );
  }

  if (!seasonData) {
    throw new Error(
      `[seasonResolver] Season not found: franchise="${franchiseSlug}" season=${seasonNumber}`
    );
  }

  // Return season context with no hardcoded UUIDs
  return {
    franchiseId: franchiseData.franchise_id,
    franchiseSlug: franchiseSlug,
    franchiseName: franchiseData.name,
    seasonId: seasonData.season_id,
    seasonNumber: seasonData.season_number,
    premiereDate: seasonData.premiere_date,
  };
}

/**
 * Retrieve all categories for a season, ordered by sequence.
 * 
 * @param {string} seasonId - The season UUID (from resolveSeasonContext.seasonId)
 * @returns {Promise<Array>} Categories ordered by sequence
 * @throws {Error} If query fails
 */
export async function getSeasonCategories(seasonId) {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("category_id, season_id, display_name, slug, sequence")
    .eq("season_id", seasonId)
    .order("sequence", { ascending: true });

  if (error) {
    throw new Error(
      `[seasonResolver] Failed to fetch categories for season ${seasonId}: ${error.message}`
    );
  }

  return data || [];
}

/**
 * Retrieve all season appearances for a season, including related queen records.
 * 
 * @param {string} seasonId - The season UUID (from resolveSeasonContext.seasonId)
 * @returns {Promise<Array>} Season appearances with joined queens data
 * @throws {Error} If query fails
 */
export async function getSeasonAppearances(seasonId) {
  const { data, error } = await supabaseAdmin
    .from("season_appearances")
    .select(
      `appearance_id,
       queen_id,
       season_id,
       display_name,
       image_path,
       queens(queen_id, display_name, slug)`
    )
    .eq("season_id", seasonId);

  if (error) {
    throw new Error(
      `[seasonResolver] Failed to fetch appearances for season ${seasonId}: ${error.message}`
    );
  }

  return data || [];
}
