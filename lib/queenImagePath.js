/**
 * lib/queenImagePath.js
 *
 * Shared helper to resolve queen portrait/thumbnail image paths.
 *
 * Source of truth: season_appearances.image_path (populated during migration)
 * Fallback: /thumbnails/queens/{queenSlug}.png (for S18 while image_path is NULL)
 *
 * This replaces the duplicated path builders from SeasonHome, QueenPage, and UserPage.
 */

/**
 * Resolve a queen's image path for a season appearance.
 *
 * @param {string|null} seasonAppearanceImagePath - The image_path value from season_appearances table
 * @param {string} queenSlug - The canonical queen slug (queens.slug)
 * @param {string} basePath - Router.basePath prefix (defaults to "")
 * @returns {string} The resolved image URL
 *
 * If season_appearances.image_path is populated, use it (new normalized paths).
 * If NULL, use the fallback pattern for backwards compatibility (S18, etc).
 */
export function getQueenImagePath(seasonAppearanceImagePath, queenSlug, basePath = "") {
  // If season_appearances.image_path is populated, use it as the authoritative source
  if (seasonAppearanceImagePath && typeof seasonAppearanceImagePath === "string" && seasonAppearanceImagePath.trim().length > 0) {
    return seasonAppearanceImagePath;
  }

  // Fallback: use the standard thumbnail path when image_path is not yet populated
  return `${basePath}/thumbnails/queens/${queenSlug}.png`;
}
