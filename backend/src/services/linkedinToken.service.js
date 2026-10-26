import LinkedInToken from "../models/linkedinToken.model.js";

export async function getValidLinkedInToken(memberUrn) {
  if (!memberUrn) return null;

  const tokenDoc = await LinkedInToken.findOne({ memberUrn });

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
