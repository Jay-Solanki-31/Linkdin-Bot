import fs from "fs";
import path from "path";
import sharp from "sharp";
import logger from "../utils/logger.js";

class ImageGenerator {
  constructor() {
    // Image generation is optional. The AI worker must be able to publish a
    // text-only post when the provider is unavailable or out of credits.
  }

  async generate(prompt, postId) {
    if (!prompt || prompt.trim().length < 20) {
      throw new Error("Prompt too short for image generation");
    }

    try {
      const enhancedPrompt = `${prompt}, high-quality corporate 3D vector illustration style, clean minimalist tech graphic, vibrant lighting, sharp focus, 4k resolution, professional digital art, studio background, textless, no realistic human faces`;

      logger.info(`Sending request to Free Flux Endpoint for Post ID: ${postId}`);

      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      
      const randomSeed = Math.floor(Math.random() * 1000000);
      
      const url = `https://pollinations.ai/p/${encodedPrompt}?model=flux&width=1200&height=627&seed=${randomSeed}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Image API responded with status: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (!buffer || buffer.length === 0) {
        throw new Error("Empty image data returned from endpoint");
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