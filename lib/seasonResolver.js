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
    .select("season_id, franchise_id, season_number, premiere_date, theme_id")
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
    themeId: seasonData.theme_id,
  };
}

/**
 * Retrieve the semantic theme values for a season's assigned theme.
 *
 * @param {string} themeId - The theme UUID (from resolveSeasonContext.themeId)
 * @returns {Promise<Object|null>} Theme fields (camelCase) or null if no theme assigned
 * @throws {Error} If query fails
 */
export async function getSeasonTheme(themeId) {
  if (!themeId) return null;

  const { data, error } = await supabaseAdmin
    .from("themes")
    .select(
      `page_background,
       ground_text_primary,
       ground_text_secondary,
       element_fill,
       element_text_primary,
       element_text_secondary,
       stacked_element_fill,
       stacked_element_text,
       element_border,
       active_toot_fill,
       active_toot_text,
       active_boot_fill,
       active_boot_text`
    )
    .eq("theme_id", themeId)
    .single();

  if (error) {
    throw new Error(`[seasonResolver] Failed to fetch theme ${themeId}: ${error.message}`);
  }

  if (!data) return null;

  return {
    pageBackground: data.page_background,
    groundTextPrimary: data.ground_text_primary,
    groundTextSecondary: data.ground_text_secondary,
    elementFill: data.element_fill,
    elementTextPrimary: data.element_text_primary,
    elementTextSecondary: data.element_text_secondary,
    stackedElementFill: data.stacked_element_fill,
    stackedElementText: data.stacked_element_text,
    elementBorder: data.element_border,
    activeTootFill: data.active_toot_fill,
    activeTootText: data.active_toot_text,
    activeBootFill: data.active_boot_fill,
    activeBootText: data.active_boot_text,
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
