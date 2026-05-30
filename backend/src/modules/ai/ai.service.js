import generateAIResponse from "../../services/groq.js";
import logger from "../../utils/logger.js";

const clamp = (str = "", max = 600) =>
  String(str)
    .replace(/\s+/g, " ")
    .replace(/[#*_>`~\-]/g, "")
    .trim()
    .slice(0, max);

class AIService {
  async generateForContent({ title, description, source, url }) {
    if (!title && !description) {
      throw new Error("AIService: empty content");
    }

    const safeTitle = clamp(title, 180);
    const safeDesc = clamp(description, 600);
    const safeSource = clamp(source, 50);

    const prompt = `
You are reading raw developer content scraped from the internet.

Your task:
1. Detect the REAL engineering problem
2. Ignore SEO fluff and filler text
3. Identify the technical pain point
4. Find the engineering lesson
5. Create a funny technical LinkedIn post

SOURCE:
${safeSource || "Developer Community"}

TITLE:
${safeTitle}

RAW CONTENT:
${safeDesc || "No additional context provided."}

POST GOALS:
- Grab attention in the first 2 lines
- Make developers relate emotionally
- Include subtle engineering humor
- Mention one useful technical insight
- Keep readers scrolling until the end
- Sound human and experienced
- Keep it concise

STYLE EXAMPLES:
- "No errors. Just vibes."
- "Works locally. Production disagreed."
- "The retry logic was basically emotional support for the database."
- "Distributed systems are computers blaming each other."

IMPORTANT:
- No corporate tone
- No motivational content
- No hashtags
- No clickbait
- No generic summaries
- No "This highlights the importance..."
- No "In today's tech world..."
- No AI-sounding phrasing

STRUCTURE:
1. Strong hook
2. Developer pain
3. Technical insight
4. Funny observation
5. Real takeaway

OUTPUT:
Plain LinkedIn post only.
`;

    try {
      let text = await generateAIResponse(prompt);

      if (!text) {
        throw new Error("Empty AI response");
      }

      text = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .replace(/^(Post:|LinkedIn Post:)/i, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (text.length < 40) {
        throw new Error("AI output too short");
      }

      return text;
    } catch (err) {
      logger.error(
        "Groq AI Processing Error:",
        err?.message || err
      );

      throw err;
    }
  }
}

export default new AIService();
