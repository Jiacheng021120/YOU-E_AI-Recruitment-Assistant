import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekServer, getDeepSeekServerText, parseJsonFromModelText } from "@/server/deepseek";

export const runtime = "nodejs";

function normalizeQuestions(value: unknown) {
  const raw = Array.isArray(value) ? value : [];
  return raw.filter(Boolean).map(String).slice(0, 6);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await callDeepSeekServer({
      temperature: 0.25,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content: "你是企业招聘面试问题生成助手。请基于候选人履历、岗位 JD、面试官方向和风格生成结构化问题。只返回 JSON，不要 Markdown。"
        },
        {
          role: "user",
          content: `请返回 JSON：{"questions":["string"],"focusPoints":["string"]}。\n候选人：${JSON.stringify(body.candidate)}\n岗位：${JSON.stringify(body.job)}\n面试官：${JSON.stringify(body.interviewer)}`
        }
      ]
    });
    const parsed = parseJsonFromModelText(getDeepSeekServerText(data));
    return NextResponse.json({
      questions: normalizeQuestions(parsed.questions),
      focusPoints: normalizeQuestions(parsed.focusPoints),
      source: "deepseek"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "DeepSeek interview questions failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 422 }
    );
  }
}
