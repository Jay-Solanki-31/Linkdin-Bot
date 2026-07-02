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

        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 400,
      },
      {
        timeout: 20000,

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text =
      data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error(
        "Groq returned empty content"
      );
    }

    return {
      text: text.trim(),
      promptType,
    };

  } catch (err) {
    const errorMessage =
      err?.response?.data?.error?.message ||
      err.message;

    throw new Error(
      `Groq request failed: ${errorMessage}`
    );

  }
}