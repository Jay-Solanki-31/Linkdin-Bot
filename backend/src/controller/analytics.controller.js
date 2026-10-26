import {
  saveAnalyticsSnapshot,
  getPostAnalytics,
  getPostsAnalytics
} from "../services/analytics.service.js";
import { requireAuthenticatedMemberUrn } from "../utils/authenticatedAccount.js";

export async function syncAnalytics(req, res) {
  try {
    const linkedinMemberUrn = requireAuthenticatedMemberUrn(req, res);
    if (!linkedinMemberUrn) return;

    const { analytics = [] } = req.body;

    if (!Array.isArray(analytics)) {
      return res.status(400).json({
        success: false,
        message: "analytics must be array",
      });
    }

    const results = [];

    for (const item of analytics) {

      const snapshot =
        await saveAnalyticsSnapshot({
          linkedinPostUrn: item.urn,

          likes:
            item.metrics.reactions || 0,

          comments:
            item.metrics.comments || 0,

          reposts:
            item.metrics.reposts || 0,

          linkedinMemberUrn,

          impressions:
            item.metrics.impressions || 0,
        });

      if (snapshot) {
        results.push(snapshot);
      }
    }

    return res.status(201).json({
      success: true,
      count: results.length,
      data: results,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAnalyticsHistory(
  req,
  res
) {
  try {
    const linkedinMemberUrn = requireAuthenticatedMemberUrn(req, res);
    if (!linkedinMemberUrn) return;
    const data = await getPostAnalytics(
      decodeURIComponent(req.params.urn),
      linkedinMemberUrn
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAnalyticsPosts(
  req,
  res
) {
  try {
    const linkedinMemberUrn = requireAuthenticatedMemberUrn(req, res);
    if (!linkedinMemberUrn) return;

    const data =
      await getPostsAnalytics(linkedinMemberUrn);

    return res.json({
      success: true,
      count: data.length,
      data,
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}