/**
 * lib/seasonNavData.js
 *
 * Shared data-loading logic for season-aware NavBar rendering.
 * Encapsulates the normalized queen/category roster for a resolved season,
 * so NavBar never queries the legacy `looks` table directly.
 *
 * Used by every season-content page (temporary S18 routes and canonical
 * /drag-race/[franchise]/[season]/... routes) to supply `seasonNav` props
 * that flow down through _app -> Layout -> NavBar.
 */

import { resolveSeasonContext, getSeasonAppearances, getSeasonCategories, getSeasonTheme } from "./seasonResolver";

/**
 * Build the season-scoped navbar context (franchise/season identity + the
 * queen and category rosters used by the Queens/Categories dropdowns).
 *
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 17, 1
 * @returns {Promise<{franchiseSlug, seasonNumber, queens, categories, theme}|null>}
 *   Returns null if the franchise/season does not exist (caller should have
 *   already 404'd in that case via its own season resolution).
 */
export async function getSeasonNavContext(franchiseSlug, seasonNumber) {
  try {
    const seasonContext = await resolveSeasonContext(franchiseSlug, seasonNumber);

    const [appearances, categories, theme] = await Promise.all([
      getSeasonAppearances(seasonContext.seasonId),
      getSeasonCategories(seasonContext.seasonId),
      getSeasonTheme(seasonContext.themeId),
    ]);

    // Queens dropdown: normalized season_appearances -> queens, alphabetical by
    // the season-specific appearance display name; linked by canonical queen slug.
    const queens = appearances
      .filter((app) => app.queens && app.queens.slug)
      .map((app) => ({
        slug: app.queens.slug,
        displayName: app.display_name || app.queens.display_name || "",
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Categories dropdown: normalized categories, ordered by authoritative sequence.
    const categoryList = categories
      .slice()
      .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
      .map((c) => ({ slug: c.slug, displayName: c.display_name }));

    return {
      franchiseSlug,
      seasonNumber: seasonContext.seasonNumber,
      queens,
      categories: categoryList,
      theme,
    };
  } catch (err) {
    console.error("[seasonNavData] Error resolving season nav context:", err);
    return null;
  }
}
