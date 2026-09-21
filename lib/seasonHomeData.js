/**
 * lib/seasonHomeData.js
 *
 * Shared data-loading logic for the season homepage (public leaderboards).
 * Encapsulates queen/category/user aggregation for both temporary and canonical routes.
 *
 * Used by:
 * - pages/index.js (temporary, S18-focused, explicit "us"/18)
 * - pages/drag-race/[franchise]/[season]/index.js (canonical, dynamic franchise/season)
 *
 * All statistics (queen ranking, category ranking, user stats) are scoped to the resolved season.
 * Empty seasons (no looks/votes yet) are valid and render sensibly.
 * Nonexistent seasons throw errors (caller handles with notFound).
 */

import { supabaseAdmin } from "./supabaseAdmin";
import { resolveSeasonContext, getSeasonCategories, getSeasonAppearances } from "./seasonResolver";

/**
 * Fetch and prepare season homepage data for public leaderboards.
 *
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 17, 1
 * @returns {Promise<{initialLooks, initialCategories, initialUsers}|null>}
 *   Returns props object on success (even if season has no looks/votes).
 *   Returns null on error (franchise/season not found, or query error).
 */
export async function getSeasonHomeData(franchiseSlug, seasonNumber) {
  try {
    // Step 1: Resolve season context dynamically
    const seasonContext = await resolveSeasonContext(franchiseSlug, seasonNumber);

    // Step 1.5: Fetch season appearances (to get queen image_path from season_appearances)
    const appearances = await getSeasonAppearances(seasonContext.seasonId);
    const appearanceById = {};
    appearances.forEach((app) => {
      appearanceById[app.appearance_id] = app;
    });

    // Step 2: Fetch season's categories to establish category filtering
    const categories = await getSeasonCategories(seasonContext.seasonId);
    const categoryIds = categories.map((c) => c.category_id);
    const categoryById = {};
    categories.forEach((category) => {
      categoryById[category.category_id] = category;
    });

    // Step 3: Fetch looks filtered by season's categories (season-scoped)
    let looks = [];
    if (categoryIds.length > 0) {
      const { data: looksData, error: looksError } = await supabaseAdmin
        .from("looks")
        .select("id, appearance_id, display_name, sequence, category_id")
        .in("category_id", categoryIds);

      if (looksError || !looksData) {
        console.error("[seasonHomeData] Error fetching looks:", looksError);
        looks = [];
      } else {
        looks = looksData;
      }
    }
    // If season has no categories, looks will be empty (this is valid for empty seasons)

    // Step 4: Fetch votes for these looks (season-scoped via looks)
    let votes = [];
    if (looks.length > 0) {
      const lookIds = looks.map((l) => l.id);
      const { data: votesData, error: votesError } = await supabaseAdmin
        .from("votes")
        .select("look_uuid, user_id, vote, updated_at")
        .in("look_uuid", lookIds);

      if (votesError || !votesData) {
        console.error("[seasonHomeData] Error fetching votes:", votesError);
        votes = [];
      } else {
        votes = votesData;
      }
    }
    // If season has no looks, votes will be empty (this is valid for empty seasons)

    // Step 5: Fetch users to map user_id to username (only users who voted in this season)
    const userIdsInSeason = new Set();
    votes.forEach((v) => {
      if (v.user_id) userIdsInSeason.add(String(v.user_id).trim());
    });

    let usersData = [];
    if (userIdsInSeason.size > 0) {
      const userIdArray = Array.from(userIdsInSeason);
      const { data: fetchedUsers, error: usersError } = await supabaseAdmin
        .from("users")
        .select("user_id, username")
        .in("user_id", userIdArray);

      if (!usersError && fetchedUsers) {
        usersData = fetchedUsers;
      } else {
        console.error("[seasonHomeData] Error fetching users:", usersError);
      }
    }

    const userIdToUsername = {};
    usersData.forEach((u) => {
      userIdToUsername[u.user_id] = u.username;
    });

    // Step 6: Map looks by UUID and extract queen/category info (season-scoped)
    const lookByUuid = {};
    const queenInfo = {};
    const categorySet = new Set();

    for (const look of looks) {
      const lookUuid = String(look.id || "").trim();
      if (!lookUuid) continue;

      lookByUuid[lookUuid] = look;

      const appearance = appearanceById[look.appearance_id];
      if (!appearance) continue;
      const slug = appearance.queens?.slug || "";
      const displayName = appearance.display_name || appearance.queens?.display_name || look.display_name || "";

      if (!queenInfo[slug]) {
        queenInfo[slug] = {
          appearanceDisplayName: displayName,
          slug,
          // Use image_path from season_appearances (authoritative), not from looks
          image_path: appearance.image_path || null,
        };
      }

      if (categoryById[look.category_id]) {
        categorySet.add(look.category_id);
      }
    }

    // Step 7: Latest vote per (look_uuid, user_id) within this season
    const latestVoteByLookUser = {};
    for (const v of votes) {
      const lookUuid = String(v.look_uuid || "").trim();
      const userId = String(v.user_id || "").trim();
      const vote = String(v.vote || "").toUpperCase().trim();
      if (!lookUuid || !userId) continue;
      if (vote !== "TOOT" && vote !== "BOOT") continue;

      const key = `${lookUuid}::${userId}`;
      const prev = latestVoteByLookUser[key];

      if (!prev || new Date(v.updated_at) > new Date(prev.updated_at)) {
        latestVoteByLookUser[key] = { lookUuid, vote, updated_at: v.updated_at };
      }
    }

    // Step 8: Initialize queen stats (season-scoped)
    const queenStats = {};
    Object.values(queenInfo).forEach((info) => {
      queenStats[info.slug] = {
        ...info,
        toots: 0,
        boots: 0,
        totalVotes: 0,
        approvalPct: null,
      };
    });

    // Initialize category stats (season-scoped)
    const categoryStats = {};
    categorySet.forEach((categoryId) => {
      const category = categoryById[categoryId];
      categoryStats[categoryId] = {
        categoryDisplayName: category.display_name,
        slug: category.slug,
        toots: 0,
        boots: 0,
        totalVotes: 0,
        approvalPct: null,
      };
    });

    // Step 9: Aggregate votes to queens and categories (season-scoped)
    for (const key in latestVoteByLookUser) {
      const { lookUuid, vote } = latestVoteByLookUser[key];
      const look = lookByUuid[lookUuid];
      if (!look) continue;

      const appearance = appearanceById[look.appearance_id];
      const queenSlug = appearance?.queens?.slug;
      const queenStat = queenStats[queenSlug];
      if (queenStat) {
        if (vote === "TOOT") queenStat.toots += 1;
        if (vote === "BOOT") queenStat.boots += 1;
        queenStat.totalVotes += 1;
      }

      // Update category stats by normalized category ID
      if (look.category_id) {
        const catStat = categoryStats[look.category_id];
        if (catStat) {
          if (vote === "TOOT") catStat.toots += 1;
          if (vote === "BOOT") catStat.boots += 1;
          catStat.totalVotes += 1;
        }
      }
    }

    // Step 10: Compute approval % for queens
    const queenRows = Object.values(queenStats).map((s) => {
      if (s.totalVotes > 0) {
        return { ...s, approvalPct: (s.toots / s.totalVotes) * 100 };
      }
      return { ...s, approvalPct: null };
    });

    // Compute approval % for categories
    const categoryRows = Object.values(categoryStats).map((s) => {
      if (s.totalVotes > 0) {
        return { ...s, approvalPct: (s.toots / s.totalVotes) * 100 };
      }
      return { ...s, approvalPct: null };
    });

    // Step 11: Sort queens + dense rank (same semantics as original)
    queenRows.sort((a, b) => {
      if ((b.approvalPct ?? -1) !== (a.approvalPct ?? -1))
        return (b.approvalPct ?? -1) - (a.approvalPct ?? -1);
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      return (a.appearanceDisplayName || "").localeCompare(b.appearanceDisplayName || "");
    });

    let lastPct = null;
    let currentRank = 0;
    queenRows.forEach((row, index) => {
      const pctKey = row.approvalPct == null ? null : row.approvalPct.toFixed(6);
      if (index === 0 || pctKey !== lastPct) {
        currentRank = index + 1;
        lastPct = pctKey;
      }
      row.rank = currentRank;
    });

    // Sort categories + dense rank (same semantics as original)
    categoryRows.sort((a, b) => {
      if ((b.approvalPct ?? -1) !== (a.approvalPct ?? -1))
        return (b.approvalPct ?? -1) - (a.approvalPct ?? -1);
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      return (a.categoryDisplayName || "").localeCompare(b.categoryDisplayName || "");
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

    // Step 12: Build user stats (season-scoped)
    const userStats = {};
    const userQueenVotes = {}; // user_id -> queen_slug -> {toots, boots}

    for (const key in latestVoteByLookUser) {
      const { lookUuid, vote } = latestVoteByLookUser[key];
      const userId = key.split("::")[1];
      const look = lookByUuid[lookUuid];
      if (!look) continue;

      // Use normalized season appearance for queen tracking
      const queen = appearanceById[look.appearance_id]?.queens?.slug;

      // Initialize user stats
      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
          username: userIdToUsername[userId] || userId,
          toots: 0,
          boots: 0,
          totalVotes: 0,
          approvalPct: null,
          favorite_queen: null,
        };
      }

      // Track overall user stats
      if (vote === "TOOT") userStats[userId].toots += 1;
      if (vote === "BOOT") userStats[userId].boots += 1;
      userStats[userId].totalVotes += 1;

      // Track per-queen votes for this user
      if (!userQueenVotes[userId]) {
        userQueenVotes[userId] = {};
      }
      if (!userQueenVotes[userId][queen]) {
        userQueenVotes[userId][queen] = { toots: 0, boots: 0 };
      }
      if (vote === "TOOT") userQueenVotes[userId][queen].toots += 1;
      if (vote === "BOOT") userQueenVotes[userId][queen].boots += 1;
    }

    // Step 13: Compute user approval %
    const userRows = Object.values(userStats).map((s) => {
      if (s.totalVotes > 0) {
        return { ...s, approvalPct: (s.toots / s.totalVotes) * 100 };
      }
      return { ...s, approvalPct: null };
    });

    // Step 14: Determine favorite queen for each user (season-scoped)
    // Highest user approval for that queen, ties broken by lower public approval
    for (const user of userRows) {
      const userQueens = userQueenVotes[user.user_id];
      if (!userQueens) continue;

      let favoriteQueen = null;
      let highestUserApproval = -1;

      for (const queenName in userQueens) {
        const { toots, boots } = userQueens[queenName];
        const totalVotes = toots + boots;
        if (totalVotes === 0) continue;

        const userApproval = (toots / totalVotes) * 100;

        if (userApproval > highestUserApproval) {
          highestUserApproval = userApproval;
          favoriteQueen = queenName;
        } else if (userApproval === highestUserApproval && favoriteQueen) {
          // Tie-breaker: select queen with lower PUBLIC approval
          const currentQueenPublicApproval =
            queenStats[favoriteQueen]?.approvalPct ?? -1;
          const candidateQueenPublicApproval =
            queenStats[queenName]?.approvalPct ?? -1;

          if (
            candidateQueenPublicApproval < currentQueenPublicApproval ||
            (candidateQueenPublicApproval === currentQueenPublicApproval &&
              queenName.localeCompare(favoriteQueen) < 0)
          ) {
            favoriteQueen = queenName;
          }
        }
      }

      user.favorite_queen = favoriteQueen;
    }

    // Step 15: Sort users by total votes DESC, then username ASC
    userRows.sort((a, b) => {
      if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
      return (a.username || a.user_id || "").localeCompare(b.username || b.user_id || "");
    });

    // Return leaderboard data
    return {
      initialLooks: queenRows,
      initialCategories: categoryRows,
      initialUsers: userRows,
      franchiseSlug,
      seasonNumber: seasonContext.seasonNumber,
    };
  } catch (error) {
    console.error("[seasonHomeData] Error:", error.message);
    return null;
  }
}
