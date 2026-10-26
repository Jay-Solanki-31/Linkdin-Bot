export function getAuthenticatedMemberUrn(req) {
  const memberUrn = req?.session?.linkedinMemberUrn;
  return typeof memberUrn === "string" && memberUrn.trim()
    ? memberUrn
    : null;
}

export function requireAuthenticatedMemberUrn(req, res) {
  const memberUrn = getAuthenticatedMemberUrn(req);
  if (!memberUrn) {
    res.status(401).json({
      success: false,
      message: "LinkedIn account is not connected",
    });
    return null;
  }
  return memberUrn;
}
