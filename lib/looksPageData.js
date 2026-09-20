/**
 * lib/looksPageData.js
 *
 * Shared data-loading logic for the All Looks page.
 * Encapsulates season-aware data fetching for both temporary and canonical routes.
 *
 * Used by:
 * - pages/looks.js (temporary, S18-focused)
 * - pages/drag-race/[franchise]/[season]/looks.js (canonical, dynamic)
 */

import { supabaseAdmin } from "./supabaseAdmin";
import { resolveSeasonContext, getSeasonCategories } from "./seasonResolver";

/**
 * Fetch and prepare All Looks page data for a given franchise/season.
 *
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 5, 1
 * @returns {Promise<{initialLooks, initialPublicApproval, initialUserApproval, categorySequenceMap}|null>}
 *   Returns props object on success, or null on error
 */
export async function getLooksPageData(franchiseSlug, seasonNumber) {
  try {
    // Step 1: Resolve season context dynamically (no hardcoded UUIDs)
    const seasonContext = await resolveSeasonContext(franchiseSlug, seasonNumber);

    // Step 2: Fetch season's categories to establish season-scoped category IDs
    const categories = await getSeasonCategories(seasonContext.seasonId);
    const categoryIds = categories.map((c) => c.category_id);

    if (categoryIds.length === 0) {
      // Season exists but has no categories
      return {
        initialLooks: [],
        initialPublicApproval: null,
        initialUserApproval: null,
        categorySequenceMap: {},
      };
    }

    // Step 3: Fetch looks filtered by season's categories (season-scoped via category_id)
    const { data: looksData, error: looksError } = await supabaseAdmin
      .from("looks")
      .select("id, display_name, contestant_name, category, sequence, image_path, category_id")
      .in("category_id", categoryIds)
      .order("sequence", { ascending: true });

    if (looksError || !looksData) {
      return {
        initialLooks: [],
        initialPublicApproval: null,
        initialUserApproval: null,
        categorySequenceMap: {},
      };
    }

    // Step 4: Fetch all votes for these looks
    const lookIds = looksData.map((l) => l.id);
    const { data: allVotesData } = await supabaseAdmin
      .from("votes")
      .select("look_uuid, vote")
      .in("look_uuid", lookIds);

    // Step 5: Calculate approval % and vote count for each look
    const lookStats = {};
    (allVotesData || []).forEach((row) => {
      if (!lookStats[row.look_uuid]) lookStats[row.look_uuid] = { toot: 0, total: 0 };
      if (row.vote === "TOOT") lookStats[row.look_uuid].toot += 1;
      lookStats[row.look_uuid].total += 1;
    });

    // Step 6: Attach stats to looks
    let looksWithStats = (looksData || []).map((look) => {
      const stats = lookStats[look.id] || { toot: 0, total: 0 };
      return {
        ...look,
        look_id: look.look_id || look.id,
        overallApproval:
          stats.total > 0 ? Math.round((stats.toot / stats.total) * 100) : null,
        overallVoteCount: stats.total,
      };
    });

    // Step 7: Build category sequence map for chronological ordering
    const categorySequenceMap = {};
    categories.forEach((cat) => {
      categorySequenceMap[cat.category_id] = cat.sequence;
    });

    // Sort by category sequence (normalized), then by look sequence within category
    // For looks with null sequence, sort alphabetically by display_name
    looksWithStats.sort((a, b) => {
      const catSeqA = categorySequenceMap[a.category_id] || 999;
      const catSeqB = categorySequenceMap[b.category_id] || 999;

      if (catSeqA !== catSeqB) return catSeqA - catSeqB;

      // Within same category: sort by look sequence if present, otherwise alphabetically
      const lookSeqA = a.sequence !== null ? a.sequence : 999;
      const lookSeqB = b.sequence !== null ? b.sequence : 999;

      if (lookSeqA !== 999 || lookSeqB !== 999) {
        if (lookSeqA !== lookSeqB) return lookSeqA - lookSeqB;
      }

      // Both have null sequence: alphabetize by contestant name (queen)
      return (a.contestant_name || "").localeCompare(b.contestant_name || "");
    });

    // Step 8: Calculate public approval for all looks in this season
    let publicToots = 0, publicTotal = 0;
    looksWithStats.forEach((look) => {
      if (look.overallApproval !== null) {
        const tootCount = Math.round((look.overallApproval / 100) * look.overallVoteCount);
        publicToots += tootCount;
        publicTotal += look.overallVoteCount;
      }
    });
    const publicApprovalPct = publicTotal > 0 ? (publicToots / publicTotal) * 100 : null;

    return {
      initialLooks: looksWithStats,
      initialPublicApproval: publicApprovalPct,
      initialUserApproval: null,
      categorySequenceMap: categorySequenceMap,
    };
  } catch (error) {
    console.error("[looksPageData] Error fetching looks:", error);
    return null;
  }
}
