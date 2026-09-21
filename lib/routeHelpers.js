/**
 * lib/routeHelpers.js
 *
 * Centralized route builders for the multi-franchise/multi-season URL structure
 * within the Drag Race project namespace.
 *
 * Designed to work with the future URL grammar:
 *   /drag-race
 *   /drag-race/{franchiseSlug}
 *   /drag-race/{franchiseSlug}/{seasonNumber}
 *   /drag-race/{franchiseSlug}/{seasonNumber}/{resource}
 *   /drag-race/{franchiseSlug}/{seasonNumber}/{resource}/{slug}
 *   /drag-race/queens/{queenSlug}
 *   /drag-race/users/{username}
 *
 * Notes:
 * - Does not query Supabase; purely constructs URLs from parameters
 * - Contains no hardcoded UUIDs or franchise/season IDs
 * - Treats regular and all-stars franchises as independent franchise records
 * - Usernames are URL-encoded to safely handle special characters
 * - All routes include /drag-race project namespace for multi-project platform
 */

// ============================================================================
// FUTURE: Multi-franchise/multi-season routes (within /drag-race namespace)
// ============================================================================

/**
 * Drag Race project home
 * @returns {string} "/drag-race"
 */
export function dragRaceHomeRoute() {
  return '/drag-race';
}

/**
 * Franchise-level route
 * @param {string} franchiseSlug - e.g. "us", "uk", "es", "us-all-stars"
 * @returns {string} e.g. "/drag-race/us"
 */
export function franchiseRoute(franchiseSlug) {
  return `/drag-race/${franchiseSlug}`;
}

/**
 * Season-level route within a franchise
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 8, 1
 * @returns {string} e.g. "/drag-race/us/18"
 */
export function seasonRoute(franchiseSlug, seasonNumber) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}`;
}

/**
 * All looks for a season
 * @param {string} franchiseSlug
 * @param {number} seasonNumber
 * @returns {string} e.g. "/drag-race/us/18/looks"
 */
export function seasonLooksRoute(franchiseSlug, seasonNumber) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}/looks`;
}

/**
 * All queens who appeared in a season
 * @param {string} franchiseSlug
 * @param {number} seasonNumber
 * @returns {string} e.g. "/drag-race/us/18/queens"
 */
export function seasonQueensRoute(franchiseSlug, seasonNumber) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}/queens`;
}

/**
 * A specific queen's appearance in a season
 * @param {string} franchiseSlug
 * @param {number} seasonNumber
 * @param {string} queenSlug - URL-safe slug, e.g. "jane-don-t"
 * @returns {string} e.g. "/drag-race/us/18/queens/jane-don-t"
 */
export function seasonQueenRoute(franchiseSlug, seasonNumber, queenSlug) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}/queens/${queenSlug}`;
}

/**
 * All categories for a season
 * @param {string} franchiseSlug
 * @param {number} seasonNumber
 * @returns {string} e.g. "/drag-race/us/18/categories"
 */
export function seasonCategoriesRoute(franchiseSlug, seasonNumber) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}/categories`;
}

/**
 * All looks in a specific category for a season
 * @param {string} franchiseSlug
 * @param {number} seasonNumber
 * @param {string} categorySlug - URL-safe slug, e.g. "drag-excellence"
 * @returns {string} e.g. "/drag-race/us/18/categories/drag-excellence"
 */
export function seasonCategoryRoute(franchiseSlug, seasonNumber, categorySlug) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}/categories/${categorySlug}`;
}

/**
 * A user's season-specific profile/votes
 * @param {string} franchiseSlug
 * @param {number} seasonNumber
 * @param {string} username - will be URL-encoded
 * @returns {string} e.g. "/drag-race/us/18/users/andrew"
 */
export function seasonUserRoute(franchiseSlug, seasonNumber, username) {
  return `/drag-race/${franchiseSlug}/${seasonNumber}/users/${encodeURIComponent(username)}`;
}

// ============================================================================
// FUTURE: Global/cross-franchise routes (within /drag-race project namespace)
// ============================================================================

/**
 * Global queen page (canonical queen profile across all appearances within Drag Race)
 * @param {string} queenSlug - URL-safe slug, e.g. "vita-vontesse-starr"
 * @returns {string} e.g. "/drag-race/queens/vita-vontesse-starr"
 */
export function globalQueenRoute(queenSlug) {
  return `/drag-race/queens/${queenSlug}`;
}

/**
 * Global user profile page (within Drag Race project)
 * @param {string} username - will be URL-encoded
 * @returns {string} e.g. "/drag-race/users/andrew"
 */
export function globalUserRoute(username) {
  return `/drag-race/users/${encodeURIComponent(username)}`;
}

