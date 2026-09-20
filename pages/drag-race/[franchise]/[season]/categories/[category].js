/**
 * pages/drag-race/[franchise]/[season]/categories/[category].js
 *
 * Canonical season-scoped category page.
 * Dynamic route parameters:
 * - [franchise]: franchise slug (e.g. "us", "uk", "es-all-stars")
 * - [season]: season number (e.g. 18, 17, 1)
 * - [category]: category slug, unique only within the resolved season (categories.slug)
 *
 * Example URLs:
 * - /drag-race/us/18/categories/drag-excellence
 * - /drag-race/us/18/categories/drag-family-resemblance
 *
 * Uses shared CategoryPage component (same presentation as pages/category/[category]).
 * Category resolution must happen within the resolved season only - category slugs
 * are not globally unique. Nonexistent franchise/season/category returns 404.
 */

import CategoryPage from "../../../../../components/CategoryPage";
import { getCategoryPageData } from "../../../../../lib/categoryPageData";
import { getSeasonNavContext } from "../../../../../lib/seasonNavData";

export default function CanonicalCategoryPage(props) {
  return <CategoryPage {...props} />;
}

export async function getServerSideProps({ params }) {
  const { franchise, season, category } = params;
  const categorySlug = String(category || "").toLowerCase();

  // Validate season parameter: must be exactly a positive integer
  if (!/^[1-9]\d*$/.test(season)) {
    return { notFound: true };
  }

  const seasonNumber = parseInt(season, 10);

  // Load season-scoped data using shared data loader (no hardcoded UUIDs)
  const [pageData, seasonNav] = await Promise.all([
    getCategoryPageData(franchise, seasonNumber, categorySlug),
    getSeasonNavContext(franchise, seasonNumber),
  ]);

  if (!pageData) {
    // Category does not exist in this season (or franchise/season don't exist)
    return { notFound: true };
  }

  return { props: { ...pageData, seasonNav } };
}
