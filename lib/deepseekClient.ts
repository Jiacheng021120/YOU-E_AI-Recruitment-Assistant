export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callDeepSeek(messages: DeepSeekMessage[]) {
  const res = await fetch("/api/deepseek", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || errorData?.error || "DeepSeek API request failed");
  }

  return res.json();
}

export function getDeepSeekText(data: unknown) {
  if (typeof data !== "object" || data === null) return "";
  const result = data as {
    text?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };
  return result.choices?.[0]?.message?.content || result.text || "";
}

