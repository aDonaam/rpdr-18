/**
 * pages/drag-race/[franchise]/[season]/index.js
 *
 * Canonical season homepage for public leaderboards.
 * Dynamic route parameters:
 * - [franchise]: franchise slug (e.g. "us", "uk", "es-all-stars")
 * - [season]: season number (e.g. 18, 17, 1)
 *
 * Example URLs:
 * - /drag-race/us/18
 * - /drag-race/us/17
 * - /drag-race/uk/3
 *
 * Uses shared SeasonHome component (same presentation as pages/index.js).
 * All leaderboard calculations are scoped to the resolved season.
 * Empty seasons (no looks/votes yet) render sensibly.
 * Nonexistent seasons return 404.
 *
 * No hardcoded franchise or season; all resolved dynamically.
 */

import { getSeasonHomeData } from "../../../../lib/seasonHomeData";
import { getSeasonNavContext } from "../../../../lib/seasonNavData";
import SeasonHome from "../../../../components/SeasonHome";

export default function CanonicalSeasonHome({ initialLooks, initialCategories, initialUsers, seasonNumber, franchiseSlug }) {
  return (
    <SeasonHome
      initialLooks={initialLooks}
      initialCategories={initialCategories}
      initialUsers={initialUsers}
      seasonTitle={`Season ${seasonNumber} Public Leaderboards`}
      franchiseSlug={franchiseSlug}
      seasonNumber={seasonNumber}
    />
  );
}

/**
 * Server-side data loading for canonical season homepage.
 * Reads franchise and season from URL params.
 */
export async function getServerSideProps({ params }) {
  const { franchise, season } = params;

  // Validate season parameter: must be exactly a positive integer
  if (!/^[1-9]\d*$/.test(season)) {
    // Invalid season format
    return {
      notFound: true,
    };
  }

  const seasonNumber = parseInt(season, 10);

  // Load season-scoped leaderboard data
  const [pageData, seasonNav] = await Promise.all([
    getSeasonHomeData(franchise, seasonNumber),
    getSeasonNavContext(franchise, seasonNumber),
  ]);

  if (!pageData) {
    // Franchise/season combination not found or error loading data
    return {
      notFound: true,
    };
  }

  // Return props with season info for dynamic title
  return {
    props: {
      ...pageData,
      seasonNumber: seasonNumber,
      seasonNav,
    },
  };
}
