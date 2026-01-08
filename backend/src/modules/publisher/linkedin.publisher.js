import axios from "axios";
import LinkedInToken from "../../models/linkedinToken.model.js";
import logger from "../../utils/logger.js";

async function getTokenRecord() {
  const token = await LinkedInToken.findById("linkedin_app_token");
  if (!token) throw new Error("LinkedIn not connected");

  if (!token.memberUrn)
    throw new Error("LinkedIn member URN missing. Reconnect LinkedIn login.");

  return token;
}

export async function publishToLinkedIn({ text }) {
  const tokenRecord = await getTokenRecord(); 
  const accessToken = tokenRecord.accessToken;
  const author = tokenRecord.memberUrn;

  const payload = {
    author,
    commentary: text,
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  try {
    const response = await axios.post(
      "https://api.linkedin.com/rest/posts",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202511", 
        },
      }
    );

    logger.info("LinkedIn Post Success", response.data);
    return { ok: true, data: response.data };
  } catch (err) {
    logger.error(
      "LinkedIn REST Post Failed",
      err?.response?.data,
      err?.response?.config?.headers
    );
    throw err;
  }
}
