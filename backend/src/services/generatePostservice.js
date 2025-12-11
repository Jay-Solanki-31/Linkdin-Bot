// src/services/generatedPostService.js
import GeneratedPost from "../models/generatedPost.model.js";

class GeneratedPostService {
  async save(articleId, payload) {
    const doc = {
      articleId,
      title: payload.title || "",
      text: typeof payload === "string" ? payload : payload.text,
      url: payload.url || "",
      source: payload.source || "",
      status: "draft",
    };
    return await GeneratedPost.create(doc);
  }
}

export default new GeneratedPostService();
