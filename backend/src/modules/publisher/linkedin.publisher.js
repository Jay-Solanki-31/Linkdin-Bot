import fs from "fs";
import axios from "axios";
import LinkedInToken from "../../models/linkedinToken.model.js";
import logger from "../../utils/logger.js";

async function getTokenRecord() {
  const token = await LinkedInToken.findById("linkedin_app_token");

  if (!token?.accessToken) {
    throw new Error("LinkedIn not connected");
  }

  if (!token?.memberUrn) {
    throw new Error("LinkedIn member URN missing");
  }

  return token;
}

async function initializeImageUpload(accessToken, owner) {
  const response = await axios.post(
    "https://api.linkedin.com/rest/images?action=initializeUpload",
    {
      initializeUploadRequest: {
        owner,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202511",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
    }
  );

  const value = response.data.value;

  return {
    imageUrn: value.image,
    uploadUrl: value.uploadUrl,
  };
}

async function uploadImage(uploadUrl, imagePath) {
  const file = fs.readFileSync(imagePath);

  await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": "application/octet-stream",
    },
    timeout: 60000,
    maxBodyLength: Infinity,
  });
}

async function createPost(
  accessToken,
  owner,
  text,
  imageUrn
) {
  const payload = {
    author: owner,

    commentary: text,

    visibility: "PUBLIC",

    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },

    lifecycleState: "PUBLISHED",

    content: {
      media: {
        id: imageUrn,
      },
    },
  };

  const response = await axios.post(
    "https://api.linkedin.com/rest/posts",
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202511",
        "X-Restli-Protocol-Version": "2.0.0",
        "Content-Type": "application/json",
      },
    }
  );

  return response.headers["x-restli-id"];
}

export async function publishToLinkedIn({
  text,
  imagePath,
  url,
}) {
  if (!text) {
    throw new Error("Missing text");
  }

  if (!imagePath) {
    throw new Error("Missing image");
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const footer = url
    ? `
    
--------------------

📖 Want to dive deeper?

Original source:
${url}`
    : "";

  const finalText = ( text + footer).trim();

  const safeText =
    finalText.length > 3000
      ? finalText.slice(0, 2997) + "..."
      : finalText;

  const {
    accessToken,
    memberUrn,
  } = await getTokenRecord();

  logger.info("Initializing LinkedIn image upload...");

  const {
    imageUrn,
    uploadUrl,
  } = await initializeImageUpload(
    accessToken,
    memberUrn
  );

  logger.info(`Image URN: ${imageUrn}`);

  logger.info("Uploading image...");

  await uploadImage(uploadUrl, imagePath);

  logger.info("Creating LinkedIn post...");

  const postUrn = await createPost(
    accessToken,
    memberUrn,
    safeText,
    imageUrn
  );

  logger.info(`LinkedIn post created: ${postUrn}`);

  if (imagePath) {
    fs.unlink(imagePath, (err) => {
      if (err) {
        logger.warn(`Failed to delete image ${imagePath} : ${err.message}`);
      } else {
        logger.info(`Deleted image ${imagePath}`);
      }
    });
  }

  return {
    ok: true,
    urn: postUrn,
  };
}