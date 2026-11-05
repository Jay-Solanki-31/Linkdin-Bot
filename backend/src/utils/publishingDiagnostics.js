// Only fixed diagnostic strings may be persisted; never include provider messages.
export function failureCode(error, stage) {
  if (
    ["AI_TIMEOUT", "AI_EMPTY_RESPONSE", "AI_GENERATION_FAILED"].includes(
      error?.code,
    )
  )
    return error.code;
  if (/token expired/i.test(error?.message || ""))
    return "LINKEDIN_TOKEN_EXPIRED";
  if (error?.code === "ECONNABORTED" || /timeout/i.test(error?.message || ""))
    return stage === "ai" ? "AI_TIMEOUT" : "LINKEDIN_TIMEOUT";
  if (/empty/i.test(error?.message || "")) return "AI_EMPTY_RESPONSE";
  return stage === "ai" ? "AI_GENERATION_FAILED" : "LINKEDIN_PUBLISH_FAILED";
}
export const activityEntry = (eventType, stage, actorType = "system") => ({
  eventType,
  stage,
  actorType,
  createdAt: new Date(),
});
export const activityPush = (entry) => ({
  activity: { $each: [entry], $slice: -100 },
});
