import axios from "axios";
import LinkedInToken from "../../models/linkedinToken.model.js";
import logger from "../../utils/logger.js";

async function getTokenRecord() {
  const token = await LinkedInToken.findOne();
  if (!token) throw new Error("LinkedIn not connected");
  return token;
}

async function getPersonURN(accessToken) {
  const res = await axios.get("https://api.linkedin.com/v2/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return `urn:li:person:${res.data.id}`;
}

export async function publishToLinkedIn({ text }) {
  const tokenRecord = await getTokenRecord();
  const accessToken = tokenRecord.accessToken;

  let personURN = tokenRecord.personURN;

  if (!personURN) {
    personURN = await getPersonURN(accessToken);

    tokenRecord.personURN = personURN;
    await tokenRecord.save();
  }

  const payload = {
    author: personURN,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  try {
    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      }
    );

    logger.info("LinkedIn Post Success", response.data);
    return { ok: true, data: response.data };
  } catch (err) {
    logger.error("LinkedIn Post Failed", err?.response?.data || err);
    throw err;
  }
}
