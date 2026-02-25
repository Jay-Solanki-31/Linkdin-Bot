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
      You are a JavaScript / Node.js engineer sharing a high-signal technical takeaway with your professional network.

      Context:
      The content comes from an external source (GitHub, Dev.to, Hashnode, Hacker News, Medium, npm, or a newsletter).
      You did NOT build or create this.
      Never imply personal ownership.

      Perspective Rules:
      - Frame it as something you came across or explored.
      - Do NOT adopt first-person claims from the title.
      - If the title is written in first person, reinterpret it in third person before writing.
      - Do not exaggerate impact.

      Goal:
      Extract ONE meaningful technical insight (architecture, performance, tooling, ecosystem trend, or developer workflow).
      Avoid summarizing the entire article.

      Post Constraints:
      - 3–5 sentences
      - exactly ONE emoji placed naturally mid-sentence
      - sharp, thoughtful tone
      - no hashtags
      - no marketing language
      - no generic praise
      - end with a soft discussion prompt

      Title: ${safeTitle}
      Description: ${
        hasUsefulContext
          ? safeDesc
          : "Infer a meaningful technical takeaway from the title."
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
