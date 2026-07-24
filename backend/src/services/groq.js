import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

export default async function generateAIResponse({
  prompt,
  systemPrompt,
  promptType,
}) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  try {
    const { data } = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 700,
      },
      {
        timeout: 20000,

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    let content = data?.choices?.[0]?.message?.content;

    if (content === null || content === undefined || String(content).trim() === "") {
      throw new Error("Groq returned empty content");
    }

    content = content
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    return {
      text: content,
      promptType,
    };
  } catch (err) {
    const errorMessage = err?.response?.data?.error?.message || err.message;

    throw new Error(`Groq request failed: ${errorMessage}`);
  }
}