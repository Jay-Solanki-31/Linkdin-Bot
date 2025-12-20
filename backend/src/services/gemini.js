import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

export default async function generateAIResponse(prompt) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing Gemini API Key");
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          { parts: [{ text: prompt }] }
        ]
      },
      {
        timeout: 15000,
        headers: { "Content-Type": "application/json" }
      }
    );

    const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (error) {
    console.error("[Gemini API Error]", error.response?.data || error.message);
    return null;
  }
}
