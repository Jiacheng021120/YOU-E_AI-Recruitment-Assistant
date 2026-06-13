import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekServer, getDeepSeekServerText, parseJsonFromModelText } from "@/server/deepseek";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await callDeepSeekServer({
      temperature: 0.35,
      maxTokens: 1100,
      messages: [
        {
          role: "system",
          content: "你是招聘排期沟通助手。根据已经由规则算法确定的面试官和时间，生成礼貌、清晰、可执行的通知文案。只返回 JSON，不要 Markdown。"
        },
        {
          role: "user",
          content: `请返回 JSON：{"candidateMessage":"string","interviewerMessage":"string","hrLog":"string","rescheduleMessage":"string"}。\n场景：${body.scenario || "一键约面"}\n候选人：${JSON.stringify(body.candidate)}\n岗位：${JSON.stringify(body.job)}\n面试官：${JSON.stringify(body.interviewer)}\n时间：${body.slot}\n轮次：${body.roundType}\n问题建议：${JSON.stringify(body.questions || [])}\n改面原因：${body.reason || ""}`
        }
      ]
    });
    const parsed = parseJsonFromModelText(getDeepSeekServerText(data));
    return NextResponse.json({
      candidateMessage: String(parsed.candidateMessage || ""),
      interviewerMessage: String(parsed.interviewerMessage || ""),
      hrLog: String(parsed.hrLog || ""),
      rescheduleMessage: String(parsed.rescheduleMessage || ""),
      source: "deepseek"
    });
  } catch (error) {
    return NextResponse.json(
      { error: "DeepSeek interview notification failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 422 }
    );
  }
}
