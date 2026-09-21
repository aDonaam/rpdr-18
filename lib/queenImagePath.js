/**
 * lib/queenImagePath.js
 *
 * Shared helper to resolve queen portrait/thumbnail image paths.
 *
 * Source of truth: season_appearances.image_path (fully populated for all
 * currently supported seasons).
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
 */
export function getQueenImagePath(seasonAppearanceImagePath, queenSlug, basePath = "") {
  return seasonAppearanceImagePath || "";
}
