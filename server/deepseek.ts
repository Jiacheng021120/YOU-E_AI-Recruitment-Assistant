export type DeepSeekServerMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callDeepSeekServer({
  messages,
  temperature = 0.7,
  maxTokens = 1000
}: {
  messages: DeepSeekServerMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `DeepSeek request failed: ${response.status}`);
  }

  return data;
}

export function getDeepSeekServerText(data: unknown) {
  if (typeof data !== "object" || data === null) return "";
  const result = data as {
    text?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  return result.choices?.[0]?.message?.content || result.text || "";
}

export function parseJsonFromModelText(text: string) {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("模型没有返回可解析 JSON。");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}
