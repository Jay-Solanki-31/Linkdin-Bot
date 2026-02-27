import LinkedInToken from "../models/linkedinToken.model.js";

export async function getValidLinkedInToken() {
  const tokenDoc = await LinkedInToken.findOne();

  if (!tokenDoc) return null;

  if (new Date() > tokenDoc.expiresAt) {
    return {
      expired: true,
      token: null,
    };
  }

  return {
    expired: false,
    token: tokenDoc.accessToken,
  };
}
