import { NextRequest, NextResponse } from "next/server";
import type { Job } from "@/lib/mock";
import { analyzeResumeWithDeepSeek } from "@/server/resumeAnalyzer";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fileName = String(body.fileName || "候选人简历");
    const resumeText = String(body.resumeText || "");
    const targetJobs = Array.isArray(body.targetJobs) ? body.targetJobs as Pick<Job, "id" | "title" | "department" | "jd" | "requiredSkills">[] : [];
    const profile = await analyzeResumeWithDeepSeek({ fileName, resumeText, targetJobs });
    return NextResponse.json({ profile, source: "deepseek" });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DeepSeek resume analyze failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 422 }
    );
  }
}
