// ai.service.js
import generateAIResponse from "../../services/groq.js"; // Updated import
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

    const prompt = `
      [Context]
      You are a JavaScript / Node.js engineer. You just finished reading an interesting technical article from ${safeSource || "the community"}. 
      
      [Input Data]
      Title: ${safeTitle}
      Context: ${safeDesc || "Focus on the technical implications of the title."}

      [Rules]
      1. Tone: Sharp, professional, and slightly academic. No "hype."
      2. Perspective: Third-person. Never say "I built this" or "In my project." Say "I've been looking into..." or "This approach to... is interesting."
      3. Length: 3–5 sentences.
      4. Emoji: Use exactly ONE 💡 or ⚙️ mid-sentence to highlight a technical point.
      5. Ending: A soft, technical question to invite discussion.
      6. No hashtags. No marketing buzzwords like "game-changer" or "must-read."

      Output ONLY the post content. No introductory text.
      `;

    try {
      let text = await generateAIResponse(prompt);

      if (!text) throw new Error("Empty AI response");

    
      text = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .replace(/^(Post:|LinkedIn Post:)/i, "")
        .trim();

      if (text.length < 30) throw new Error("AI output too short");

      return text;
    } catch (err) {
      // Updated log name to Groq
      logger.error("Groq AI Processing Error:", err?.message || err);
      throw err; 
    }
  }

}

export default new AIService();
