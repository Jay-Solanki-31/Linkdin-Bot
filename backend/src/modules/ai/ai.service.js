import generateAIResponse from "../../services/groq.js";
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

    const promptType = availablePromptTypes[
      Math.floor(Math.random() * availablePromptTypes.length)
    ];

    const systemPrompt = prompts[promptType] || prompts.insight;

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

OUTPUT

Return ONLY valid JSON.

The JSON must exactly follow this schema:

{
  "post": "string",
  "imagePrompt": "string"
}

Requirements:

- Do not wrap the JSON in Markdown.
- Do not use code fences.
- Do not include explanations.
- Do not include any text before or after the JSON.
- "post" must contain the complete LinkedIn post.
- "imagePrompt" must describe a professional illustration inspired by the post.`;

    try {
      const result = await generateAIResponse({
        prompt,
        systemPrompt,
        promptType,
      });

      if (!result?.text) {
        throw new Error("Empty AI response");
      }

      let parsed;

      try {
        parsed = JSON.parse(result.text);
      } catch (parseError) {
        const cleaned = String(result.text)
          .replace(/^[^\{\[]*/s, "")
          .replace(/[^\}\]]*$/s, "")
          .trim();
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          throw new Error("AI returned invalid JSON");
        }
      }

      const cleanedPost = parsed.post
        ?.replace(/\n{3,}/g, "\n\n")
        .trim();

      const cleanedImagePrompt = parsed.imagePrompt?.trim();

      if (!cleanedPost || cleanedPost.length < 40) {
        throw new Error("Invalid LinkedIn post");
      }

      if (!cleanedImagePrompt || cleanedImagePrompt.length < 20) {
        throw new Error("Invalid image prompt");
      }

      return {
        text: cleanedPost,
        imagePrompt: cleanedImagePrompt,
        promptType: result.promptType,
        sourceType,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message === "AI returned invalid JSON") {
        throw err;
      }

      throw new Error(`Groq request failed: ${message}`);
    }
  }
}

export default new AIService();
