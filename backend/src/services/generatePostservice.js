import GeneratedPost from "../models/generatedPost.model.js";

class GeneratedPostService {
  async save(articleId, payload) {
    const doc = {
      articleId,
      title: payload.title || "",
      text: typeof payload === "string" ? payload : payload.text,
      url: payload.url || "",
      source: payload.source || "",
      slot: payload.slot || "",
      status: "draft",
    };
    try {
      return await GeneratedPost.create(doc);
    } catch (err) {
      if (err?.code === 11000) {
        return await GeneratedPost.findOne({ articleId });
      }
      throw err;
    }
  }
}

export default new GeneratedPostService();
