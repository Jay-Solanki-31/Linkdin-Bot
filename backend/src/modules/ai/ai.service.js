import generateAIResponse from "../../services/groq.js";
import logger from "../../utils/logger.js";
import prompts from "../../prompts/index.js";
import sourceMap from "../../prompts/sourceMap.js";
import { detectSourceType } from "../../utils/contentClassifier.js";

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

    const sourceType = detectSourceType(url);

    const availablePromptTypes = sourceMap[sourceType] || sourceMap.general;

    const promptType =
      availablePromptTypes[
      Math.floor(Math.random() * availablePromptTypes.length)
      ];

const systemPrompt =
  prompts[promptType] || prompts.insight;
  
    const safeTitle = clamp(title, 180);
    const safeDesc = clamp(description, 600);
    const safeSource = clamp(source, 50);

    const prompt = `
You are analyzing developer content collected from technical communities.

Your job:

* Understand the core idea.
* Identify engineering implications.
* Identify tradeoffs, lessons, or interesting opinions.
* Ignore SEO content, marketing language, and filler text.
* Focus on what developers actually care about.

CONTENT SOURCE:
${safeSource || "Developer Community"}

TITLE:
${safeTitle}

CONTENT:
${safeDesc || "No additional context provided."}

IMPORTANT:

* Do not summarize the article.
* Do not rewrite the article.
* Focus on the most interesting insight.
* Think like an experienced engineer.
* Use the style and structure defined in the system prompt.
* Generate an original LinkedIn post inspired by the content.

OUTPUT:
Plain LinkedIn post only.
`;

    try {
      const result = await generateAIResponse({
        prompt,
        systemPrompt,
        promptType,
      });
      if (!result?.text) {
        throw new Error("Empty AI response");
      }

      const cleanedText = result.text
        .replace(/`[\s\S]*?`/g, "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .replace(/^(Post:|LinkedIn Post:)/i, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (cleanedText.length < 40) {
        throw new Error("AI output too short");
      }

      return {
        text: cleanedText,
        promptType: result.promptType,
        sourceType,
      };

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
