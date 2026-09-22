/**
 * lib/categoryPageData.js
 *
 * Shared data-loading logic for category-page views.
 * Encapsulates season-aware data fetching for both temporary and canonical routes.
 *
 * Used by:
 * - pages/category/[category].js (temporary, S18-focused)
 * - pages/drag-race/[franchise]/[season]/categories/[category].js (canonical, dynamic)
 *
 * Category slugs are unique only within a season, so resolution always happens
 * against the resolved season's categories, never globally.
 */

import { supabaseAdmin } from "./supabaseAdmin";
import { resolveSeasonContext, getSeasonCategories, getSeasonAppearances } from "./seasonResolver";

/**
 * Fetch and prepare category-page data for a given franchise/season/category.
 *
 * @param {string} franchiseSlug - e.g. "us", "uk", "es-all-stars"
 * @param {number} seasonNumber - e.g. 18, 5, 1
 * @param {string} categorySlug - e.g. "drag-family-resemblance" (categories.slug, season-scoped)
 * @returns {Promise<{initialLooks, categoryName, categorySlug, initialPublicRank, totalCategories, allLooksData, allVotesData}|null>}
 *   Returns props object on success, or null on error/nonexistent category
 */
export async function getCategoryPageData(franchiseSlug, seasonNumber, categorySlug) {
  try {
    // Step 1: Resolve season context dynamically (no hardcoded UUIDs)
    const seasonContext = await resolveSeasonContext(franchiseSlug, seasonNumber);

    // Step 2: Fetch season's categories to resolve the requested category within this season
    const categories = await getSeasonCategories(seasonContext.seasonId);
    const category = categories.find((c) => c.slug === categorySlug);

    if (!category) {
      // Category slug does not exist in this season (may exist in another season)
      return null;
    }

    const categoryIds = categories.map((c) => c.category_id);

    // Step 3: Build appearance display-name map for this season (queens.slug -> display_name)
    const appearances = await getSeasonAppearances(seasonContext.seasonId);
    const appearanceById = {};
    appearances.forEach((app) => {
      appearanceById[app.appearance_id] = {
        displayName: app.display_name || app.queens?.display_name || "",
        slug: app.queens?.slug || "",
      };
    });

    // Step 4: Fetch looks for this category only (normalized category_id)
    const { data: looksRaw, error: looksError } = await supabaseAdmin
      .from("looks")
      .select("id, appearance_id, display_name, sequence, image_path, look_note, category_id")
      .eq("category_id", category.category_id);

    if (looksError || !looksRaw) {
      return {
        initialLooks: [],
        categoryName: category.display_name,
        categorySlug,
        initialPublicRank: null,
        totalCategories: categories.length,
        allLooksData: [],
        allVotesData: [],
        franchiseSlug,
        seasonNumber: seasonContext.seasonNumber,
      };
    }

    // Step 5: Fetch votes for these looks
    const lookIds = looksRaw.map((l) => l.id);
    let votesRaw = [];
    if (lookIds.length > 0) {
      const { data: votesData, error: votesError } = await supabaseAdmin
        .from("votes")
        .select("look_uuid, vote, user_id, updated_at")
        .in("look_uuid", lookIds);

      if (!votesError && votesData) {
        votesRaw = votesData;
      }
    }

    // Step 6: Aggregate votes per look row (latest per user per look)
    const latestByUserLook = {};
    votesRaw.forEach((row) => {
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

    const grouped = {};
    Object.values(latestByUserLook).forEach(({ lookId, vote }) => {
      if (!grouped[lookId]) grouped[lookId] = { toot: 0, total: 0 };
      grouped[lookId].total += 1;
      if (vote === "TOOT") grouped[lookId].toot += 1;
    });

    // Step 7: Attach approval stats + normalized appearance/category display data to each look
    const looks = looksRaw.map((look) => {
      const g = grouped[look.id];
      const appearance = appearanceById[look.appearance_id] || {};
      const appearanceDisplayName = appearance.displayName || look.display_name || "";
      if (!g || g.total === 0) {
        return {
          ...look,
          appearanceDisplayName,
          queenSlug: appearance.slug || null,
          categoryDisplayName: category.display_name,
          categorySlug,
          overallApproval: null,
          overallVoteCount: 0,
        };
      }
      const pct = Math.round((g.toot / g.total) * 100);
      return {
        ...look,
        appearanceDisplayName,
        queenSlug: appearance.slug || null,
        categoryDisplayName: category.display_name,
        categorySlug,
        overallApproval: pct,
        overallVoteCount: g.total,
      };
    });

    // Default (chronological) order: explicit within-category sequence ascending where
    // present, otherwise season-appearance display name alphabetically, then a
    // deterministic fallback. looks.sequence is nullable and category-scoped only.
    looks.sort((a, b) => {
      const seqA = a.sequence !== null && a.sequence !== undefined ? a.sequence : 999;
      const seqB = b.sequence !== null && b.sequence !== undefined ? b.sequence : 999;
      if (seqA !== seqB) return seqA - seqB;

      const nameCmp = (a.appearanceDisplayName || "").localeCompare(b.appearanceDisplayName || "");
      if (nameCmp !== 0) return nameCmp;

      return String(a.id).localeCompare(String(b.id));
    });

    // Step 8: Fetch ALL looks + votes for this season (for category ranking context)
    const { data: allLooksData } = await supabaseAdmin
      .from("looks")
      .select("id, category_id")
      .in("category_id", categoryIds);

    const { data: allVotesData } = categoryIds.length > 0
      ? await supabaseAdmin
          .from("votes")
          .select("look_uuid, vote, user_id")
          .in("look_uuid", (allLooksData || []).map((l) => l.id))
      : { data: [] };

    // Step 9: Calculate this category's public rank among all categories in this season
    let initialPublicRank = null;
    const totalCategories = categories.length;

    if (allLooksData && allVotesData) {
      const categoryLooks = {};
      allLooksData.forEach((look) => {
        if (!categoryLooks[look.category_id]) categoryLooks[look.category_id] = [];
        categoryLooks[look.category_id].push(look.id);
      });

      const categoryPublicApprovals = {};
      Object.entries(categoryLooks).forEach(([catId, ids]) => {
        let toots = 0, total = 0;
        allVotesData.forEach((vote) => {
          if (ids.includes(vote.look_uuid)) {
            if (vote.vote === "TOOT") toots += 1;
            total += 1;
          }
        });
        categoryPublicApprovals[catId] = total > 0 ? (toots / total) * 100 : 0;
      });

      const categorySlugById = {};
      categories.forEach((c) => {
        categorySlugById[c.category_id] = c.slug;
      });

      const categoryRows = Object.entries(categoryPublicApprovals).map(([catId, approval]) => ({
        categoryId: catId,
        approval,
      }));

      // Sort by approval descending, deterministic tie-break by category slug
      categoryRows.sort((a, b) => {
        if (b.approval !== a.approval) return b.approval - a.approval;
        return (categorySlugById[a.categoryId] || "").localeCompare(categorySlugById[b.categoryId] || "");
      });

      // Dense rank
      let lastApproval = null;
      let currentRank = 0;
      categoryRows.forEach((row, index) => {
        const approvalKey = row.approval.toFixed(6);
        if (index === 0 || approvalKey !== lastApproval) {
          currentRank = index + 1;
          lastApproval = approvalKey;
        }
        row.rank = currentRank;
      });

      const currentCategoryRow = categoryRows.find((row) => row.categoryId === category.category_id);
      initialPublicRank = currentCategoryRow ? currentCategoryRow.rank : null;
    }

    return {
      initialLooks: looks,
      categoryName: category.display_name,
      categorySlug,
      initialPublicRank,
      totalCategories,
      allLooksData: allLooksData || [],
      allVotesData: allVotesData || [],
      franchiseSlug,
      seasonNumber: seasonContext.seasonNumber,
    };
  } catch (err) {
    console.error("[categoryPageData] Error loading category page data:", err);
    return null;
  }
}
