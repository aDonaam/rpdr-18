/**
 * pages/drag-race/[franchise]/[season]/queens/[queen].js
 *
 * Canonical season-scoped queen page.
 * Dynamic route parameters:
 * - [franchise]: franchise slug (e.g. "us", "uk", "es-all-stars")
 * - [season]: season number (e.g. 18, 17, 1)
 * - [queen]: canonical queen slug (e.g. "jane-don-t")
 *
 * Example URLs:
 * - /drag-race/us/18/queens/jane-don-t
 * - /drag-race/uk/3/queens/justice
 *
 * Uses shared QueenPage component (same presentation as pages/queen/[queen]).
 * Queen resolution must confirm the queen appeared in the resolved season.
 * Nonexistent franchise/season/queen returns 404.
 */

import QueenPage from "../../../../../components/QueenPage";
import { getQueenPageData } from "../../../../../lib/queenPageData";
import { getSeasonNavContext } from "../../../../../lib/seasonNavData";

export default function CanonicalQueenPage(props) {
  return <QueenPage {...props} />;
}

export async function getServerSideProps({ params }) {
  const { franchise, season, queen } = params;
  const queenSlug = String(queen || "").toLowerCase();

  // Validate season parameter: must be exactly a positive integer
  if (!/^[1-9]\d*$/.test(season)) {
    return { notFound: true };
  }

  const seasonNumber = parseInt(season, 10);

  // Load season-scoped data using shared data loader (no hardcoded UUIDs)
  const [pageData, seasonNav] = await Promise.all([
    getQueenPageData(franchise, seasonNumber, queenSlug),
    getSeasonNavContext(franchise, seasonNumber),
  ]);

  if (!pageData) {
    // Queen does not appear in this season (or queen/franchise/season don't exist)
    return { notFound: true };
  }

  return { props: { ...pageData, seasonNav } };
}
