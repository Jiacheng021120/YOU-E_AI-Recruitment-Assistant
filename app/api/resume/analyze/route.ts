import { NextRequest, NextResponse } from "next/server";
import { generateRandomCandidateProfile } from "@/lib/mock";
import type { Job } from "@/lib/mock";
import { analyzeResumeWithDeepSeek } from "@/server/resumeAnalyzer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resumeText = String(body.resumeText || "");
    const targetJobs = Array.isArray(body.targetJobs) ? body.targetJobs as Pick<Job, "id" | "title" | "department" | "jd" | "requiredSkills">[] : [];
    const profile = await analyzeResumeWithDeepSeek({ resumeText, targetJobs });
    return NextResponse.json({ profile, source: "deepseek" });
  } catch (error) {
    return NextResponse.json({
      profile: generateRandomCandidateProfile(),
      source: "mock",
      warning: "当前 DeepSeek 暂不可用，已使用模拟结果。",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
