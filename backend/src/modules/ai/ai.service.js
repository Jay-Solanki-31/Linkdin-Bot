import generateAIResponse from "../../services/gemini.js";
import generatedPostService from "../../services/generatePostservice.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

class AIService {
  async generateForContent(contentId) {
    const item = await FetchedContent.findById(contentId);

    if (!item) {
      logger.warn("AIService: content not found:", contentId);
      return null;
    }

      if (!item.slot || item.status !== "selected") {
    logger.warn("AIService: content not slot-assigned:", contentId);
    await FetchedContent.findByIdAndUpdate(contentId, {
      $set: {
        processing: false,
        isQueued: false,
      }
    });
    return null;
  }


    // Safety check: already generated
    if (item.aiGenerated) {
      logger.info("AIService: already generated for", contentId);
      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: { processing: false, processingAt: null, isQueued: false }
      });
      return null;
    }

    const description =
      item.description && item.description.length > 700
        ? item.description.slice(0, 700)
        : item.description;

    const hasUsefulContext = description && description.length > 80;

    const prompt = `
You are a LinkedIn creator sharing a thoughtful discovery with your professional network.

Write ONE natural LinkedIn post using the information below.

Strict guidelines:
- Write like a real person reflecting on something valuable they just learned.
- Do NOT summarize the content. React to one meaningful idea.
- Focus on ONE clear insight or takeaway.
- Use a professional but conversational tone.
- Aim for 3–5 sentences. Each sentence should add a new thought.
- Include exactly ONE relevant emoji, placed mid-sentence for emphasis.
- Mention ${item.source} naturally as part of the narrative (not as credit text).
- Avoid marketing language, buzzwords, and hashtags.
- The final line should gently invite conversation (not a pushy CTA).
- Place the URL on a separate final line, exactly as provided.

Content to base the post on:
Title: ${item.title}
Description: ${
      hasUsefulContext
        ? description
        : "Use the title to infer a single thoughtful takeaway."
    }
Source: ${item.source || "the original author"}
URL: ${item.url}

Output only the post text. Do not add explanations.
`;

    let text;
    try {
      text = await generateAIResponse(prompt);
    } catch (err) {
      logger.error("Gemini API Error:", err?.message || err);
      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          processing: false,
          processingAt: null,
          isQueued: false,
          aiError: "gemini_error"
        }
      });
      throw err;
    }

    if (!text) {
      logger.warn("AIService: empty response for", contentId);
      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          processing: false,
          processingAt: null,
          isQueued: false,
          aiError: "no_response"
        }
      });
      return null;
    }

    try {
      await generatedPostService.save(item._id, {
        title: item.title,
        text,
        url: item.url,
        source: item.source,
        slot: item.slot
      });

      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          aiGenerated: true,
          processing: false,
          processingAt: null,
          isQueued: false,
          aiError: null
        }
      });
      logger.info("AIService: successfully generated for", contentId);
      return text;
    } catch (err) {
      logger.error("AIService: save error:", err?.message || err);
      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: {
          processing: false,
          processingAt: null,
          isQueued: false,
          aiError: err.message?.slice(0, 512) || "save_error"
        }
      });
      throw err;
    }
  }

}

export default new AIService();
