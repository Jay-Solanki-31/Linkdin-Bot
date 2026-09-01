import axios from "axios";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import logger from "../utils/logger.js";

class ImageGenerator {
  async generate(prompt, postId) {
    if (!prompt || prompt.trim().length < 20) {
      throw new Error("Prompt too short for image generation");
    }

    try {
      const imageUrl =
      `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}` +
      `?model=...` +
      `&width=1200` +
      `&height=627`;

      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
      });

      if (!response.data?.length) {
        throw new Error("Empty image returned");
      }

      const uploadDir = path.join(
        process.cwd(),
        "uploads",
        "images"
      );

      await fs.promises.mkdir(uploadDir, {
        recursive: true,
      });

      const filename = `${postId}.jpg`;
      const imagePath = path.join(uploadDir, filename);

      const metadata = await sharp(response.data).metadata();

      logger.info(
        `Generated image: ${metadata.width}x${metadata.height}`
      );

      await sharp(response.data)
        .resize(1200, 627, {
          fit: "cover",
          position: "centre",
          withoutEnlargement: false,
        })
        .jpeg({
          quality: 92,
          mozjpeg: true,
        })
        .toFile(imagePath);

      logger.info(`Image optimized: ${imagePath}`);

      return {
        imagePath,
      };
    } catch (err) {
      logger.error(
        `Image generation failed: ${err.message}`
      );

      throw err;
    }
  }
}

export default new ImageGenerator();