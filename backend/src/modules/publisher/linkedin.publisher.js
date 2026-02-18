import axios from "axios";
import LinkedInToken from "../../models/linkedinToken.model.js";
import logger from "../../utils/logger.js";

async function getTokenRecord() {
  const token = await LinkedInToken.findById("linkedin_app_token");

  if (!token?.accessToken) throw new Error("LinkedIn not connected");
  if (!token?.memberUrn) throw new Error("LinkedIn member URN missing");

  return token;
}

export async function publishToLinkedIn({ text, url, title }) {
  if (!text || text.length < 10) {
    throw new Error("Invalid post text");
  }

  if (!url) {
    throw new Error("URL is required for article share post");
  }

  const { accessToken, memberUrn: author } = await getTokenRecord();

  // Keep caption clean & readable
  const safeText =
    text.length > 1300 ? text.slice(0, 1290) + "..." : text;

  const payload = {
    author,
    commentary: safeText,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",

    content: {
      article: {
        source: url,
        title: title || "Read more",
      },
    },
  };

  try {
    const { data } = await axios.post(
      "https://api.linkedin.com/rest/posts",
      payload,
      {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202511",
        },
      }
    );

    logger.info("LinkedIn Article Share Post Success");
    return { ok: true, data };
  } catch (err) {
    logger.error(
      "LinkedIn publish failed",
      err?.response?.data || err.message
    );
    throw err;
  }
}
