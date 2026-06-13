import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekServer, getDeepSeekServerText, parseJsonFromModelText } from "@/server/deepseek";

export const runtime = "nodejs";

function list(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).map(String).slice(0, 5) : [];
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
          content: "你是招聘面评整理助手。请根据面试官输入和候选人信息生成结构化面评。只返回 JSON，不要 Markdown。"
        },
        {
          role: "user",
          content: `请返回 JSON：{"summary":"string","strengths":["string"],"risks":["string"],"decision":"建议通过|建议不通过|待补充评估","nextRoundFocus":["string"]}。\n候选人：${JSON.stringify(body.candidate)}\n面试记录：${body.feedbackText || "面试表现符合岗位基础要求，沟通顺畅，项目表达较完整。"}`
        }
      ]
    });
    const parsed = parseJsonFromModelText(getDeepSeekServerText(data));
    return NextResponse.json({
      summary: String(parsed.summary || "DeepSeek 已整理面评。"),
      strengths: list(parsed.strengths),
      risks: list(parsed.risks),
      decision: String(parsed.decision || "待补充评估"),
      nextRoundFocus: list(parsed.nextRoundFocus),
      source: "deepseek"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "DeepSeek feedback summary failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 422 }
    );
  }
}
