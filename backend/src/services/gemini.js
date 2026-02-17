import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

export default async function generateAIResponse(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const url =
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

  try {
    const { data } = await axios.post(
      `${url}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        timeout: 20000,
        headers: { "Content-Type": "application/json" },
      }
    );

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("Gemini returned empty content");

    return text.trim();
  } catch (err) {
    // IMPORTANT → throw, never swallow
    throw new Error(
      `Gemini request failed: ${
        err?.response?.data?.error?.message || err.message
      }`
    );
  }
}
