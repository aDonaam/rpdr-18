/**
 * lib/queenPageData.js
 *
 * Shared data-loading logic for queen-page views.
 * Encapsulates season-aware data fetching for both temporary and canonical routes.
 *
 * Used by:
 * - pages/queen/[queen].js (temporary, S18-focused)
 * - pages/drag-race/[franchise]/[season]/queens/[queen].js (canonical, dynamic)
 */

import { supabaseAdmin } from "./supabaseAdmin";
import { resolveSeasonContext, getSeasonCategories, getSeasonAppearances } from "./seasonResolver";

/**
 * Fetch and prepare queen-page data for a given franchise/season/queen.
 *
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 5, 1
 * @param {string} queenSlug - e.g. "jane-don-t" (canonical queen slug from queens.slug)
 * @returns {Promise<{initialLooks, queenName, queenSlug, initialPublicRank, allLooksData, allVotesData}|null>}
 *   Returns props object on success, or null on error/nonexistent queen
 */
export async function getQueenPageData(franchiseSlug, seasonNumber, queenSlug) {
  try {
    // Step 1: Resolve season context dynamically (no hardcoded UUIDs)
    const seasonContext = await resolveSeasonContext(franchiseSlug, seasonNumber);

    // Step 2: Get all season appearances to find the queen
    const appearances = await getSeasonAppearances(seasonContext.seasonId);

    // Step 3: Find the queen's appearance in this season
    const queenAppearance = appearances.find(
      (app) => app.queens && app.queens.slug === queenSlug
    );

    if (!queenAppearance) {
      // Queen does not appear in this season (or queen doesn't exist)
      return null;
    }

    // Step 4: Get the queen's display name for this season (may differ from canonical name)
    const queenName = queenAppearance.display_name || (queenAppearance.queens && queenAppearance.queens.display_name) || "";

    // Step 5: Fetch season's categories to establish season-scoped category IDs
    const categories = await getSeasonCategories(seasonContext.seasonId);
    const categoryIds = categories.map((c) => c.category_id);

    // Build category sequence map for chronological ordering (authoritative season chronology)
    const categorySequenceMap = {};
    // Canonical category slug per category_id, so LookCard can link to the
    // canonical /categories/ route instead of re-deriving a slug from the
    // legacy display name.
    const categorySlugMap = {};
    categories.forEach((cat) => {
      categorySequenceMap[cat.category_id] = cat.sequence;
      categorySlugMap[cat.category_id] = cat.slug;
    });

    if (categoryIds.length === 0) {
      // Season exists but has no categories - return empty looks but valid queen
      return {
        initialLooks: [],
        queenName,
        queenSlug,
        initialPublicRank: null,
        allLooksData: [],
        allVotesData: [],
        categorySequenceMap: {},
        franchiseSlug,
        seasonNumber: seasonContext.seasonNumber,
      };
    }

    // Step 6: Fetch looks for this queen, filtered by season's categories
    // This ensures we only get looks from this season for this queen
    const { data: looksRaw, error: looksError } = await supabaseAdmin
      .from("looks")
      .select("id, look_id, display_name, contestant_name, contestant_slug, category, sequence, image_path, category_id")
      .eq("contestant_slug", queenSlug)
      .in("category_id", categoryIds)
      .order("sequence", { ascending: true });

    if (looksError || !looksRaw) {
      // Query error - return no looks for this queen (they may not have any looks in this season)
      return {
        initialLooks: [],
        queenName,
        queenSlug,
        initialPublicRank: null,
        allLooksData: [],
        allVotesData: [],
        categorySequenceMap,
        franchiseSlug,
        seasonNumber: seasonContext.seasonNumber,
      };
    }

    // Step 7: Fetch all votes for these looks
    const lookIds = looksRaw.map((l) => l.id);
    let allVotesData = [];
    if (lookIds.length > 0) {
      const { data: votesRaw, error: votesError } = await supabaseAdmin
        .from("votes")
        .select("look_uuid, vote, user_id, updated_at")
        .in("look_uuid", lookIds);

      if (!votesError && votesRaw) {
        allVotesData = votesRaw;
      }
    }

    // Step 8: Aggregate votes per look row (latest per user per look)
    const latestByUserLook = {};
    (allVotesData || []).forEach((row) => {
      const lookId = String(row.look_uuid || "").trim();
      const userId = String(row.user_id || "").trim();
      const vote = String(row.vote || "").toUpperCase().trim();
      if (!lookId || !userId) return;
      if (vote !== "TOOT" && vote !== "BOOT") return;
      const key = `${lookId}::${userId}`;
      if (!latestByUserLook[key] || new Date(row.updated_at) > new Date(latestByUserLook[key].updated_at)) {
        latestByUserLook[key] = { lookId, vote, updated_at: row.updated_at };
      }
    });

    // Step 9: Calculate approval per look row
    const grouped = {};
    Object.values(latestByUserLook).forEach(({ lookId, vote }) => {
      if (!grouped[lookId]) grouped[lookId] = { toot: 0, total: 0 };
      grouped[lookId].total += 1;
      if (vote === "TOOT") grouped[lookId].toot += 1;
    });

    const looks = (looksRaw || []).map((look) => {
      const g = grouped[look.id];
      const categorySlug = categorySlugMap[look.category_id] || null;
      if (!g || g.total === 0) {
        return { ...look, overallApproval: null, overallVoteCount: 0, tootCount: 0, categorySlug };
      }
      const pct = Math.round((g.toot / g.total) * 100);
      return { ...look, overallApproval: pct, overallVoteCount: g.total, tootCount: g.toot, categorySlug };
    });

    // Chronological order: category sequence (authoritative) first, then explicit
    // within-category look sequence, then a deterministic fallback.
    looks.sort((a, b) => {
      const catSeqA = categorySequenceMap[a.category_id] ?? 999;
      const catSeqB = categorySequenceMap[b.category_id] ?? 999;
      if (catSeqA !== catSeqB) return catSeqA - catSeqB;

      const lookSeqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 999;
      const lookSeqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 999;
      if (lookSeqA !== lookSeqB) return lookSeqA - lookSeqB;

      return String(a.look_id || a.id).localeCompare(String(b.look_id || b.id));
    });

    // Step 10: Fetch ALL looks for this season (for ranking context)
    // This is used to calculate the queen's rank among all queens in this season
    const { data: allLooksData } = await supabaseAdmin
      .from("looks")
      .select("id, contestant_name")
      .in("category_id", categoryIds);

    // Step 11: Calculate public rank of this queen within this season
    let initialPublicRank = null;
    if (allLooksData && allVotesData) {
      // Group looks by queen (within this season)
      const queenLooks = {};
      allLooksData.forEach((look) => {
        if (!queenLooks[look.contestant_name]) {
          queenLooks[look.contestant_name] = [];
        }
        queenLooks[look.contestant_name].push(look.id);
      });

      // Calculate public approval per queen (within this season)
      const queenPublicApprovals = {};
      Object.entries(queenLooks).forEach(([qName, lookIds]) => {
        let toots = 0, total = 0;
        (allVotesData || []).forEach((vote) => {
          if (lookIds.includes(vote.look_uuid)) {
            if (vote.vote === "TOOT") toots += 1;
            total += 1;
          }
        });
        queenPublicApprovals[qName] = total > 0 ? (toots / total) * 100 : 0;
      });

      // Build array of queens with approval percentages
      const queenRows = Object.entries(queenPublicApprovals).map(([name, approval]) => ({
        name,
        approval,
      }));

      // Sort by approval descending
      queenRows.sort((a, b) => b.approval - a.approval);

      // Assign ranks with tie handling (dense rank)
      let lastApproval = null;
      let currentRank = 0;
      queenRows.forEach((row, index) => {
        const approvalKey = row.approval.toFixed(6);
        if (index === 0 || approvalKey !== lastApproval) {
          currentRank = index + 1;
          lastApproval = approvalKey;
        }
        row.rank = currentRank;
      });

      // Find rank of current queen
      const currentQueenRow = queenRows.find((row) => row.name === queenName);
      initialPublicRank = currentQueenRow ? currentQueenRow.rank : null;
    }

    return {
      initialLooks: looks,
      queenName,
      queenSlug,
      initialPublicRank,
      allLooksData: allLooksData || [],
      allVotesData: allVotesData || [],
      categorySequenceMap,
      franchiseSlug,
      seasonNumber: seasonContext.seasonNumber,
    };
  } catch (err) {
    console.error("[queenPageData] Error loading queen page data:", err);
    return null;
  }
}
