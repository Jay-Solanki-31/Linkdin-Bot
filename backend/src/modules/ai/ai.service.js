// ai.service.js
import generateAIResponse from "../../services/gemini.js";
import logger from "../../utils/logger.js";

const clamp = (str = "", max = 700) =>
  String(str).replace(/\s+/g, " ").trim().slice(0, max);

class AIService {
  async generateForContent({ title, description, source, url }) {
    if (!title && !description) {
      throw new Error("AIService: empty content");
    }

    const safeTitle = clamp(title, 200);
    const safeDesc = clamp(description, 700);
    const safeSource = clamp(source, 50);
    const safeUrl = clamp(url, 300);

    const hasUsefulContext = safeDesc.length > 80;

    const prompt = `
You are a LinkedIn creator sharing a thoughtful discovery with your professional network.

Write ONE natural LinkedIn post.

Rules:
- 3–5 sentences
- exactly ONE emoji mid sentence
- conversational tone
- no hashtags
- no marketing language
- end with soft discussion invite

Title: ${safeTitle}
Description: ${
      hasUsefulContext
        ? safeDesc
        : "Use the title to infer a single thoughtful takeaway."
    }
Source: ${safeSource || "the original author"}
URL: ${safeUrl}

Output only the post text.
`;

    try {
      let text = await generateAIResponse(prompt);

      if (!text) throw new Error("Empty AI response");

      // cleanup
      text = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .trim();

      if (text.length < 30) throw new Error("AI output too short");

      return text;
    } catch (err) {
      logger.error("Gemini API Error:", err?.message || err);
      throw err; 
    }
  }

}

export default new AIService();
