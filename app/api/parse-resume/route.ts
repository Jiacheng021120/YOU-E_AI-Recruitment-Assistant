import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

function extractJsonObject(text: string) {
  const cleaned = String(text || "").replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("模型没有返回可解析 JSON。");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeProfile(profile: Record<string, unknown>) {
  const fallback = (value: unknown, defaultValue: string) => value == null || value === "" ? defaultValue : String(value);
  const list = (value: unknown) => Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  const jobs = Array.isArray(profile.recommendedJobs) ? profile.recommendedJobs as Record<string, unknown>[] : [];
  return {
    name: fallback(profile.name, "候选人"),
    school: fallback(profile.school, "未识别"),
    major: fallback(profile.major, "未识别"),
    education: fallback(profile.education, "未识别"),
    city: fallback(profile.city, "未识别"),
    graduationYear: fallback(profile.graduationYear, "未识别"),
    internships: list(profile.internships),
    projects: list(profile.projects),
    skills: list(profile.skills),
    targetRoles: list(profile.targetRoles),
    resumeSummary: fallback(profile.resumeSummary, "AI 已完成简历解析，请补充更多经历细节以提升建议质量。"),
    strengths: list(profile.strengths),
    weaknesses: list(profile.weaknesses),
    optimizationTips: list(profile.optimizationTips).slice(0, 6),
    interviewTips: list(profile.interviewTips).slice(0, 6),
    recommendedJobs: jobs.slice(0, 5).map((job, index) => ({
      id: String(job.id || ["j1", "j2", "j4", "j5", "j3"][index] || `job-${index + 1}`),
      title: String(job.title || "推荐岗位"),
      department: String(job.department || "待定部门"),
      matchLevel: ["高", "较高", "中等", "较低"].includes(String(job.matchLevel)) ? String(job.matchLevel) : "中等",
      reason: String(job.reason || "与简历经历存在一定匹配。")
    }))
  };
}

async function extractResumeText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type.includes("pdf")) {
    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy();
    return data.text || "";
  }
  if (name.endsWith(".docx") || file.type.includes("officedocument.wordprocessingml.document")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return buffer.toString("utf8");
  }
  if (name.endsWith(".doc")) {
    throw new Error("暂不支持老版 .doc 的真实文本提取，请另存为 .docx 或 PDF 后上传。");
  }
  if (file.type.startsWith("image/")) {
    throw new Error("图片简历需要 OCR 能力，当前版本暂不支持图片文字识别，请上传可复制文字的 PDF 或 DOCX。");
  }
  return buffer.toString("utf8");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const resume = formData.get("resume");
    if (!(resume instanceof File)) throw new Error("没有找到上传的简历文件。");

    const resumeText = (await extractResumeText(resume)).replace(/\s+\n/g, "\n").trim();
    if (resumeText.length < 20) {
      throw new Error("简历文本太少，可能是扫描版 PDF 或图片简历，当前无法真实提取。请上传可复制文字的 PDF/DOCX。");
    }

    const schema = `{
  "name": "string",
  "school": "string",
  "major": "string",
  "education": "string",
  "city": "string",
  "graduationYear": "string",
  "internships": ["string"],
  "projects": ["string"],
  "skills": ["string"],
  "targetRoles": ["string"],
  "resumeSummary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "optimizationTips": ["string"],
  "interviewTips": ["string"],
  "recommendedJobs": [{"id":"j1|j2|j3|j4|j5","title":"string","department":"string","matchLevel":"高|较高|中等|较低","reason":"string"}]
}`;

    const baseUrl = req.nextUrl.origin;
    const response = await fetch(`${baseUrl}/api/deepseek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        temperature: 0.1,
        max_tokens: 1600,
        messages: [
          {
            role: "system",
            content: "你是招聘简历解析器。只根据用户提供的简历文本提取信息，不要编造学校、公司、项目、技能。无法识别就写“未识别”或空数组。只返回合法 JSON，不要 Markdown。候选人端禁止出现鹅值、鸽值、鸽鹅机制、画像、风险、百分位。"
          },
          {
            role: "user",
            content: `请把以下简历解析为 JSON，必须符合这个 schema：\n${schema}\n\n可推荐岗位只能从以下岗位中选择：j1 产品运营实习生/产品增长，j2 数据分析实习生/数据平台，j3 内容运营实习生/内容生态，j4 前端开发实习生/研发效能，j5 用户增长实习生/市场增长。\n\n文件名：${resume.name}\n\n简历文本：\n${resumeText.slice(0, 18000)}`
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.message || data?.error || "DeepSeek 简历解析失败" }, { status: 422 });
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const profile = normalizeProfile(extractJsonObject(content));
    return NextResponse.json({ profile, extractedTextLength: resumeText.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "解析失败" },
      { status: 422 }
    );
  }
}
