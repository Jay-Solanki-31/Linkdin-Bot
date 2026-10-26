import LinkedInToken from "../models/linkedinToken.model.js";
export async function automationEnabled(memberUrn) {
  const account = await LinkedInToken.findOne({ memberUrn });
  return Boolean(account && account.automationEnabled !== false);
}
