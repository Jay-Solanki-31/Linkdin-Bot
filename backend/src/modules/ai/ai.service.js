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
Write a single LinkedIn post based *only* on the following information.

**Follow these refined rules strictly:**

* **Tone:** Professional, engaging, and conversational. The post should sound like a person sharing a valuable discovery or insight, not an advertisement.
* **Structure & Length:** Exactly one version. The body must consist of **4 to 5 impactful sentences** maximum.
* **Content Integration:** The post must summarize the main value/insight from the ${item.title} and ${item.description} to encourage reading.
* **Engagement Element:** Include exactly **one relevant emoji** (not at the start, use it to highlight a key concept).
* **Source Credit (Mandatory):** Mention the ${item.source} *naturally* within one of the sentences to credit the origin.
* **Closing CTA:** The final sentence must be a short, direct Call-to-Action (CTA) that invites discussion or action (e.g., "What are your thoughts on this?", "Worth exploring?", "Let me know what you find.").
* **Format:** Avoid all hashtags.
* **URL Placement:** Include the ${item.url} at the very end, exactly as provided.

**Content Data:**
Title: ${item.title}
Description: ${item.description || "No description provided. Focus solely on the title's implied value."}
Source: ${item.source || "Unknown"}
URL: ${item.url}
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
