import { InferenceClient } from "@huggingface/inference";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import logger from "../utils/logger.js";

class ImageGenerator {
  constructor() {
    const token = process.env.HF_TOKEN;
    if (!token) {
      throw new Error("Missing HF_TOKEN in environment variables");
    }
    this.hf = new InferenceClient(token);
  }

  async generate(prompt, postId) {
    if (!prompt || prompt.trim().length < 20) {
      throw new Error("Prompt too short for image generation");
    }

    try {
      const enhancedPrompt = `${prompt}, high-quality corporate 3D vector illustration style, clean minimalist tech graphic, vibrant lighting, sharp focus, 4k resolution, professional digital art, studio background, textless, no realistic human faces`;

      logger.info(`Sending SDK request to Hugging Face for Post ID: ${postId}`);

      const responseBlob = await this.hf.textToImage({
        model: "black-forest-labs/FLUX.1-schnell",
        inputs: enhancedPrompt,
      });

      const buffer = Buffer.from(await responseBlob.arrayBuffer());

      if (!buffer || buffer.length === 0) {
        throw new Error("Empty image data returned from Hugging Face");
      }

      const uploadDir = path.join(process.cwd(), "uploads", "images");
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const filename = `${postId}.jpg`;
      const imagePath = path.join(uploadDir, filename);

      const metadata = await sharp(buffer).metadata();
      logger.info(`Generated raw image format: ${metadata.format}`);

      await sharp(buffer)
        .resize(1200, 627, {
          fit: "cover",
          position: "centre",
          withoutEnlargement: false,
        })
        .jpeg({
          quality: 95,
          mozjpeg: true,
        })
        .toFile(imagePath);

      logger.info(`Image optimized and saved: ${imagePath}`);

      return { imagePath };
    } catch (err) {
      logger.error(`Image generation failed: ${err.message}`);
      throw err;
    }
  }
}

export default new ImageGenerator();