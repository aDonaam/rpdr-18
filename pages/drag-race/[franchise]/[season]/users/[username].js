/**
 * pages/drag-race/[franchise]/[season]/users/[username].js
 *
 * Canonical season-scoped user page (personal leaderboards).
 * Dynamic route parameters:
 * - [franchise]: franchise slug (e.g. "us", "uk", "es-all-stars")
 * - [season]: season number (e.g. 18, 17, 1)
 * - [username]: application username (public.users.username), or raw user_id
 *
 * Example URLs:
 * - /drag-race/us/18/users/andrew
 * - /drag-race/us/17/users/andrew (valid user, valid season, zero season data)
 *
 * Uses shared UserPage component (same presentation as pages/user/[username]).
 * A user is not inherently a season participant: a real user + real season with
 * no appearances/categories/votes yet renders a zero-data state, not a 404.
 * Only a nonexistent user or nonexistent franchise/season returns 404.
 */

import UserPage from "../../../../../components/UserPage";
import { getUserPageData } from "../../../../../lib/userPageData";
import { getSeasonNavContext } from "../../../../../lib/seasonNavData";

export default function CanonicalUserPage(props) {
  return <UserPage {...props} />;
}

export async function getServerSideProps({ params }) {
  const { franchise, season, username } = params;

  // Validate season parameter: must be exactly a positive integer
  if (!/^[1-9]\d*$/.test(season)) {
    return { notFound: true };
  }

  const seasonNumber = parseInt(season, 10);

  // Load season-scoped data using shared data loader (no hardcoded UUIDs)
  const [pageData, seasonNav] = await Promise.all([
    getUserPageData(franchise, seasonNumber, username),
    getSeasonNavContext(franchise, seasonNumber),
  ]);

  if (!pageData) {
    // Nonexistent username, or nonexistent franchise/season
    return { notFound: true };
  }

  return { props: { ...pageData, seasonNav } };
}
