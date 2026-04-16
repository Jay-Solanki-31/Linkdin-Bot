import dotenv from "dotenv";
dotenv.config();
import axios from "axios";

export default async function generateAIResponse(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  const url = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const { data } = await axios.post(
      url,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are a senior JavaScript engineer. You write concise, high-signal technical insights for LinkedIn without marketing fluff."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.6, // Lower temperature for more consistent professional tone
        max_tokens: 1024
      },
      {
        timeout: 20000,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned empty content");

    return text.trim();
  } catch (err) {
    const errorMessage = err?.response?.data?.error?.message || err.message;
    throw new Error(`Groq request failed: ${errorMessage}`);
  }
}