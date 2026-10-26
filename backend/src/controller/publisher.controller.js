import { changeSchedule } from "../routes/studio.routes.js";
export async function publishGeneratedPost(req, res) {
 try {
 if (!req.session?.linkedinMemberUrn) return res.status(401).json({message: "LinkedIn account is not connected"});
 return await changeSchedule(req, res);
 } catch { return res.status(503).json({message: "Publishing could not be queued. Refresh to check status."}); }
}
