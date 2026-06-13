import { NextRequest, NextResponse } from "next/server";
import { callDeepSeekServer } from "@/server/deepseek";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = body.messages || [
      {
        role: "user",
        content: body.prompt || "你好，请简单介绍你自己。"
      }
    ];

    const data = await callDeepSeekServer({
      messages,
      temperature: body.temperature ?? 0.7,
      maxTokens: body.max_tokens ?? 1000
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isMissingKey = message.includes("Missing DEEPSEEK_API_KEY");
    return NextResponse.json(
      {
        error: isMissingKey ? "Missing DEEPSEEK_API_KEY" : "Internal API route error",
        message: isMissingKey
          ? "DeepSeek API Key is not configured. Please add DEEPSEEK_API_KEY in Vercel Environment Variables and redeploy."
          : message
      },
      { status: isMissingKey ? 500 : 502 }
    );
  }
}
