/**
 * lib/userPageData.js
 *
 * Shared data-loading logic for user-page (personal leaderboards) views.
 * Encapsulates season-aware data fetching for both temporary and canonical routes.
 *
 * Used by:
 * - pages/user/[username].js (temporary, S18-focused)
 * - pages/drag-race/[franchise]/[season]/users/[username].js (canonical, dynamic)
 *
 * Season scoping: votes has no season_id. Season membership is determined via
 * the normalized chain votes -> looks -> category_id -> categories -> season_id,
 * by restricting the looks query to the resolved season's category_ids.
 *
 * A user is not inherently a season participant, so a valid user + valid season
 * with zero appearances/categories/votes is a valid (empty) result, not null.
 * Only a nonexistent user or a nonexistent franchise/season resolves to null.
 */

import { supabaseAdmin } from "./supabaseAdmin";
import { resolveSeasonContext, getSeasonCategories, getSeasonAppearances } from "./seasonResolver";

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const UUID_RE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Resolve a username (or raw user_id) param to a confirmed users row.
 * @returns {Promise<{user_id: string, username: string}|null>} null if no matching user exists
 */
async function resolveUser(usernameParam) {
  const raw = String(usernameParam || "").trim();
  if (!raw) return null;

  // Try username lookup first (case-insensitive), preserving legacy behavior
  const { data: byUsername } = await supabaseAdmin
    .from("users")
    .select("user_id, username")
    .ilike("username", raw);
  if (byUsername && byUsername.length > 0) {
    return { user_id: byUsername[0].user_id, username: byUsername[0].username };
  }

  // Fall back to direct user_id lookup if the param looks like a UUID
  if (UUID_RE.test(raw)) {
    const { data: byId } = await supabaseAdmin
      .from("users")
      .select("user_id, username")
      .eq("user_id", raw)
      .single();
    if (byId) {
      return { user_id: byId.user_id, username: byId.username };
    }
  }

  return null;
}

/**
 * Fetch and prepare user-page (personal leaderboards) data for a given
 * franchise/season/username.
 *
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 17, 1
 * @param {string} usernameParam - username or raw user_id
 * @returns {Promise<{username, displayUsername, rows, categories}|null>}
 *   Returns null if the user does not exist, or franchise/season does not exist.
 *   Returns a valid (possibly empty) props object for a real user + real season,
 *   even if that season has no appearances/categories/votes yet.
 */
export async function getUserPageData(franchiseSlug, seasonNumber, usernameParam) {
  try {
    const resolvedUser = await resolveUser(usernameParam);
    if (!resolvedUser) {
      // Nonexistent username/user_id
      return null;
    }
    const { user_id, username: displayUsername } = resolvedUser;
    const username = String(usernameParam || "").trim();

    // Resolve season context dynamically (throws if franchise/season don't exist)
    const seasonContext = await resolveSeasonContext(franchiseSlug, seasonNumber);

    // Season's categories establish season-scoped category_ids (may be empty, e.g. S17)
    const categories = await getSeasonCategories(seasonContext.seasonId);
    const categoryIds = categories.map((c) => c.category_id);
    const categoryBySlugId = {};
    categories.forEach((c) => {
      categoryBySlugId[c.category_id] = c;
    });

    // Season's appearances establish the full roster of queens for this season
    const appearances = await getSeasonAppearances(seasonContext.seasonId);

    if (categoryIds.length === 0) {
      // Valid user + valid season with no categories yet (e.g. S17): render zero-data state
      return { username, displayUsername, rows: [], categories: [], franchiseSlug, seasonNumber: seasonContext.seasonNumber };
    }

    // Looks scoped to this season only (via normalized category_id)
    const { data: looks, error: looksError } = await supabaseAdmin
      .from("looks")
      .select("id, display_name, contestant_name, contestant_slug, category, category_id, image_path")
      .in("category_id", categoryIds);

    if (looksError || !looks) {
      return { username, displayUsername, rows: [], categories: [], franchiseSlug, seasonNumber: seasonContext.seasonNumber };
    }

    // This user's votes, restricted to season-scoped look ids
    const lookIds = looks.map((l) => l.id);
    let votes = [];
    if (lookIds.length > 0) {
      const { data: votesData, error: votesError } = await supabaseAdmin
        .from("votes")
        .select("look_uuid, user_id, vote, updated_at")
        .eq("user_id", user_id)
        .in("look_uuid", lookIds);

      if (!votesError && votesData) {
        votes = votesData;
      }
    }

    // Map looks by uuid, and queen identity by canonical slug (normalized)
    const lookByUuid = {};
    looks.forEach((look) => {
      const lookUuid = String(look.id || "").trim();
      if (lookUuid) lookByUuid[lookUuid] = look;
    });

    // Queen roster comes from season_appearances (all queens in this season),
    // not merely from looks the user happened to vote on.
    const queenInfoBySlug = {};
    appearances.forEach((app) => {
      const slug = app.queens && app.queens.slug;
      if (!slug) return;
      const displayName = app.display_name || app.queens.display_name || "";
      const lookWithImage = looks.find((l) => l.contestant_slug === slug && l.image_path);
      queenInfoBySlug[slug] = {
        contestant_name: displayName,
        display_name: displayName,
        slug,
        image_path: lookWithImage ? lookWithImage.image_path : null,
      };
    });

    // Only the latest vote per (look_uuid, user_id)
    const latestVoteByLookUser = {};
    for (const v of votes) {
      const lookUuid = String(v.look_uuid || "").trim();
      const userId = String(v.user_id || "").trim();
      const vote = String(v.vote || "").toUpperCase().trim();
      if (!lookUuid || !userId) continue;
      if (vote !== "TOOT" && vote !== "BOOT") continue;
      const key = `${lookUuid}::${userId}`;
      if (!latestVoteByLookUser[key] || new Date(v.updated_at) > new Date(latestVoteByLookUser[key].updated_at)) {
        latestVoteByLookUser[key] = { lookUuid, userId, vote, updated_at: v.updated_at };
      }
    }

    // Initialize queen stats for every queen in the season roster (zero votes included)
    const queenStats = {};
    Object.values(queenInfoBySlug).forEach((info) => {
      queenStats[info.slug] = { ...info, toots: 0, boots: 0, totalVotes: 0, approvalPct: null };
    });

    for (const key in latestVoteByLookUser) {
      const { lookUuid, vote } = latestVoteByLookUser[key];
      const look = lookByUuid[lookUuid];
      if (!look) continue;
      const s = queenStats[look.contestant_slug];
      if (!s) continue;
      if (vote === "TOOT") s.toots += 1;
      if (vote === "BOOT") s.boots += 1;
      s.totalVotes += 1;
    }

    const rows = Object.values(queenStats).map((s) => {
      if (s.totalVotes > 0) {
        return { ...s, approvalPct: (s.toots / s.totalVotes) * 100 };
      }
      return { ...s, approvalPct: null };
    });

    // Sort by approval %, then total votes, then name (unvoted queens sink to bottom)
    rows.sort((a, b) => {
      if ((b.approvalPct ?? -1) !== (a.approvalPct ?? -1))
        return (b.approvalPct ?? -1) - (a.approvalPct ?? -1);
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      return (a.display_name || a.contestant_name || "").localeCompare(
        b.display_name || b.contestant_name || ""
      );
    });

    let lastPct = null;
    let currentRank = 0;
    rows.forEach((row, index) => {
      const pctKey = row.approvalPct == null ? null : row.approvalPct.toFixed(6);
      if (index === 0 || pctKey !== lastPct) {
        currentRank = index + 1;
        lastPct = pctKey;
      }
      row.rank = currentRank;
    });

    // Categories Leaderboard: only categories the user actually voted in this season
    const categorySet = new Set();
    for (const key in latestVoteByLookUser) {
      const { lookUuid } = latestVoteByLookUser[key];
      const look = lookByUuid[lookUuid];
      if (look && look.category_id) categorySet.add(look.category_id);
    }

    const categoryStats = {};
    categorySet.forEach((categoryId) => {
      const cat = categoryBySlugId[categoryId];
      if (!cat) return;
      categoryStats[categoryId] = {
        category: cat.display_name,
        slug: cat.slug,
        toots: 0,
        boots: 0,
        totalVotes: 0,
        approvalPct: null,
      };
    });

    for (const key in latestVoteByLookUser) {
      const { lookUuid, vote } = latestVoteByLookUser[key];
      const look = lookByUuid[lookUuid];
      if (!look || !look.category_id) continue;
      const catStat = categoryStats[look.category_id];
      if (!catStat) continue;
      if (vote === "TOOT") catStat.toots += 1;
      if (vote === "BOOT") catStat.boots += 1;
      catStat.totalVotes += 1;
    }

    const categoryRows = Object.values(categoryStats).map((s) => {
      if (s.totalVotes > 0) {
        return { ...s, approvalPct: (s.toots / s.totalVotes) * 100 };
      }
      return { ...s, approvalPct: null };
    });

    categoryRows.sort((a, b) => {
      if ((b.approvalPct ?? -1) !== (a.approvalPct ?? -1))
        return (b.approvalPct ?? -1) - (a.approvalPct ?? -1);
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      return (a.category || "").localeCompare(b.category || "");
    });

    lastPct = null;
    currentRank = 0;
    categoryRows.forEach((row, index) => {
      const pctKey = row.approvalPct == null ? null : row.approvalPct.toFixed(6);
      if (index === 0 || pctKey !== lastPct) {
        currentRank = index + 1;
        lastPct = pctKey;
      }
      row.rank = currentRank;
    });

    return { username, displayUsername, rows, categories: categoryRows, franchiseSlug, seasonNumber: seasonContext.seasonNumber };
  } catch (err) {
    console.error("[userPageData] Error loading user page data:", err);
    return null;
  }
}
