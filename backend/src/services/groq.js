import dotenv from "dotenv";
dotenv.config();

import axios from "axios";

const SYSTEM_PROMPT = `
You write LinkedIn posts for software engineers.

Your writing style:
- funny
- technical
- concise
- slightly sarcastic
- emotionally relatable for developers
- human sounding

Avoid:
- corporate tone
- marketing language
- motivational advice
- generic AI summaries
- academic writing
- buzzwords
- fake inspirational endings

Behavior:
- Focus on engineering pain
- Make bugs/problems feel relatable
- Add subtle developer humor
- Use short punchy lines
- Make the post skimmable
- Sound like an experienced engineer
- Keep the reader curious until the end

Good examples:
- "No errors. Just vibes."
- "The bug disappeared when the senior joined the call."
- "Distributed systems are just computers gaslighting each other."

Bad examples:
- "This highlights the importance of..."
- "In today's fast-paced world..."
- "This innovative approach demonstrates..."

Rules:
- Maximum 180 words
- No hashtags
- No markdown
- No emoji spam
- Do not mention being an AI
- Output ONLY the LinkedIn post
`;

export default async function generateAIResponse(prompt) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  try {
    const { data } = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
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

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("Groq returned empty content");
    }

    return text.trim();
  } catch (err) {
    const errorMessage =
      err?.response?.data?.error?.message || err.message;

    throw new Error(`Groq request failed: ${errorMessage}`);
  }
}