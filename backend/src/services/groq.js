
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
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: Number(process.env.GROQ_MAX_TOKENS) || 2000,
      },
      {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const choice = data?.choices?.[0];
    const message = choice?.message;
    const content = message?.content;

    // console.info("[Groq] Response metadata:", {
    //   model: data?.model,
    //   finishReason: choice?.finish_reason,
    //   promptTokens: data?.usage?.prompt_tokens,
    //   completionTokens: data?.usage?.completion_tokens,
    //   contentType: typeof content,
    //   contentLength:
    //     typeof content === "string" ? content.length : null,
    //   hasChoices: Array.isArray(data?.choices),
    //   choiceCount: data?.choices?.length ?? 0,
    // });

    if (typeof content !== "string" || !content.trim()) {
      throw new Error(
        `Groq returned no usable text (finish_reason=${choice?.finish_reason ?? "unknown"})`
      );
    }

    const text = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    return {
      text,
      promptType,
      finishReason: choice?.finish_reason,
      usage: data?.usage,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("[Groq] HTTP request failed:", {
        status: err.response?.status,
        code: err.code,
        message:
          err.response?.data?.error?.message ?? err.message,
        requestId:
          err.response?.headers?.["x-request-id"] ?? null,
      });
    } else {
      console.error("[Groq] Response processing failed:", {
        message: err.message,
      });
    }
    const message = err?.response?.data?.error?.message ?? err?.message ?? String(err);
    throw new Error('Groq request failed: ' + message, { cause: err });
  }
}
