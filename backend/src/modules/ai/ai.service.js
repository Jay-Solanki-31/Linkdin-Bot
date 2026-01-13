import generateAIResponse from "../../services/gemini.js";
import generatedPostService from "../../services/generatePostservice.js";
import FetchedContent from "../../models/fetchedContent.model.js";
import logger from "../../utils/logger.js";

class AIService {
  // process a single content id Used by worker
  async generateForContent(contentId) {
    const item = await FetchedContent.findById(contentId);
    if (!item) {
      logger.warn("AIService: content not found:", contentId);
      return null;
    }

    // ensure this item isn't already aiGenerated
    if (item.aiGenerated) {
      logger.info("AIService: already generated for", contentId);
      // ensure flags cleared
      await FetchedContent.findByIdAndUpdate(contentId, { $set: { processing: false, processingAt: null, isQueued: false } });
      return null;
    }

    // set gemini prompt to generate post
const prompt = `
You are a LinkedIn creator sharing a thoughtful discovery with your professional network.

Write ONE natural LinkedIn post using the information below.

Strict guidelines:
- Write like a real person reflecting on something valuable they just learned.
- Focus on ONE clear insight or takeaway (not a summary).
- Use a professional but conversational tone.
- The post must be 3–5 short sentences (natural variation is allowed).
- Include exactly ONE relevant emoji, placed mid-sentence for emphasis.
- Mention ${item.source} naturally as part of the narrativecd (not as credit text).
- Avoid marketing language, buzzwords, and hashtags.
- The final line should gently invite conversation (not a pushy CTA).
- Place the URL on a separate final line, exactly as provided.

Content to base the post on:
Title: ${item.title}
Description: ${item.description || "Use the title to infer the core idea."}
Source: ${item.source || "the original author"}
URL: ${item.url}
Output only the post text. Do not add explanations.
`;

    let text;
    try {
      text = await generateAIResponse(prompt);
    } catch (err) {
      logger.error("Gemini API Error", err?.message || err);
      throw err;
    }

    if (!text) {
      logger.warn("AIService: no response for", contentId);
      // unqueue & clear processing so it can be retried later by scheduler
      await FetchedContent.findByIdAndUpdate(contentId, { $set: { isQueued: false, processing: false, processingAt: null, aiError: "no_response" } });
      return null;
    }

    try {
      await generatedPostService.save(item._id, {
        title: item.title,
        text,
        url: item.url,
        source: item.source,
      });

      // mark processed
      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: { aiGenerated: true, isQueued: false, processing: false, processingAt: null, aiError: null }
      });

      logger.info("AIService: generated for", contentId);
      return text;
    } catch (err) {
      logger.error("AIService: save error", err?.message || err);
      // release locks
      await FetchedContent.findByIdAndUpdate(contentId, {
        $set: { processing: false, processingAt: null, isQueued: false, aiError: err.message?.slice(0, 512) || "save_error" }
      });
      throw err;
    }
  }

  // generate next unprocessed content keeps previous behavior for routes
  async generateForNext() {
    const item = await FetchedContent.findOne({ aiGenerated: false, isQueued: { $ne: true }, processing: { $ne: true } });
    if (!item) return { status: "empty" };
    // mark queued so scheduler doesn't requeue 
    await FetchedContent.findByIdAndUpdate(item._id, { $set: { isQueued: true } });
    const text = await this.generateForContent(item._id.toString());
    return { id: item._id, text };
  }
}

export default new AIService();
