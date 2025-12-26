import { publishToLinkedIn } from "../modules/publisher/linkedin.publisher.js";

export async function testPublish(req, res) {
  try {
    const result = await publishToLinkedIn({
      text: "🚀 Test Post — Hello from LinkedIn Bot!",
    });

    return res.json({
      success: true,
      posted: true,
      linkedin: result.data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.response?.data || err.message,
    });
  }
}
