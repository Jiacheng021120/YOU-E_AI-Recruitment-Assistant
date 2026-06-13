import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { analyzeResumeWithDeepSeek } from "@/server/resumeAnalyzer";

export const runtime = "nodejs";

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

    const profile = await analyzeResumeWithDeepSeek({ fileName: resume.name, resumeText });
    return NextResponse.json({ profile, extractedTextLength: resumeText.length, source: "deepseek" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "解析失败" },
      { status: 422 }
    );
  }
}
