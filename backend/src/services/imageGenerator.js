import axios from "axios";
import fs from "fs";
import path from "path";
import sharp from "sharp";

class ImageGenerator {
  async generate(prompt, postId) {
    if (!prompt || prompt.trim().length < 20) {
      throw new Error("Prompt too short for image generation");
    }

    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
      });

      if (!response.data) {
        throw new Error("Empty image returned");
      }

      const uploadDir = path.join(process.cwd(), "uploads", "images");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
          recursive: true,
        });
      }

      const filename = `${postId}.jpg`;
      const imagePath = path.join(uploadDir, filename);

      await sharp(response.data)
        .resize({
          width: 1200,
          height: 627,
          fit: "cover",
          position: "center",
        })
        .jpeg({
          quality: 90,
          mozjpeg: true,
        })
        .toFile(imagePath);

      return {
        imagePath,
      };
    } catch (err) {
      throw err;
    }
  }
}

export default new ImageGenerator();