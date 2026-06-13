import type { CandidateProfile, Job } from "@/lib/mock";
import { callDeepSeekServer, getDeepSeekServerText, parseJsonFromModelText } from "@/server/deepseek";

function list(value: unknown) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function text(value: unknown, fallback: string) {
  return value == null || value === "" ? fallback : String(value);
}

export function normalizeCandidateProfile(profile: Record<string, unknown>): CandidateProfile & { applicationType?: "日常实习" | "暑期实习" | "校园招聘" | "社招" } {
  const jobs = Array.isArray(profile.recommendedJobs) ? profile.recommendedJobs as Record<string, unknown>[] : [];
  return {
    name: text(profile.name, "候选人"),
    school: text(profile.school, "未识别"),
    major: text(profile.major, "未识别"),
    education: text(profile.education, "未识别"),
    city: text(profile.city, "未识别"),
    graduationYear: text(profile.graduationYear, "未识别"),
    applicationType: ["日常实习", "暑期实习", "校园招聘", "社招"].includes(String(profile.applicationType)) ? profile.applicationType as "日常实习" | "暑期实习" | "校园招聘" | "社招" : undefined,
    internships: list(profile.internships),
    projects: list(profile.projects),
    skills: list(profile.skills),
    targetRoles: list(profile.targetRoles),
    resumeSummary: text(profile.resumeSummary, "DeepSeek 已完成简历解析，请补充更多经历细节以提升建议质量。"),
    strengths: list(profile.strengths),
    weaknesses: list(profile.weaknesses),
    optimizationTips: list(profile.optimizationTips).slice(0, 6),
    interviewTips: list(profile.interviewTips).slice(0, 6),
    recommendedJobs: jobs.slice(0, 5).map((job, index) => ({
      id: String(job.id || ["j1", "j2", "j4", "j5", "j3"][index] || `job-${index + 1}`),
      title: text(job.title, "推荐岗位"),
      department: text(job.department, "待定部门"),
      matchLevel: ["高", "较高", "中等", "较低"].includes(String(job.matchLevel)) ? job.matchLevel as "高" | "较高" | "中等" | "较低" : "中等",
      reason: text(job.reason, "与简历经历存在一定匹配。")
    }))
  };
}

export async function analyzeResumeWithDeepSeek({
  resumeText,
  targetJobs = []
}: {
  fileName?: string;
  resumeText: string;
  targetJobs?: Pick<Job, "id" | "title" | "department" | "jd" | "requiredSkills">[];
}) {
  const cleanedResumeText = resumeText.replace(/\s+\n/g, "\n").trim();
  if (cleanedResumeText.length < 20) {
    throw new Error("简历文本太少。请粘贴完整简历文本，或使用随机生成模拟履历体验功能。");
  }

  const jobs = targetJobs.length ? targetJobs : [
    { id: "j1", title: "产品运营实习生", department: "产品增长", jd: "负责用户调研、活动复盘、需求整理和增长策略执行。", requiredSkills: ["用户调研", "数据复盘", "沟通协作"] },
    { id: "j2", title: "数据分析实习生", department: "数据平台", jd: "负责指标体系、SQL 分析、看板搭建和业务洞察。", requiredSkills: ["SQL", "Excel", "指标体系"] },
    { id: "j4", title: "前端开发实习生", department: "研发效能", jd: "负责 React/TypeScript 前端页面、组件库和业务系统体验优化。", requiredSkills: ["React", "TypeScript", "Next.js"] },
    { id: "j5", title: "用户增长实习生", department: "市场增长", jd: "负责用户增长实验、渠道分析和增长活动落地。", requiredSkills: ["增长实验", "数据分析", "活动运营"] }
  ];

  const schema = `{
  "name": "string",
  "school": "string",
  "major": "string",
  "education": "string",
  "city": "string",
  "graduationYear": "string",
  "applicationType": "日常实习|暑期实习|校园招聘|社招",
  "internships": ["string"],
  "projects": ["string"],
  "skills": ["string"],
  "targetRoles": ["string"],
  "resumeSummary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "optimizationTips": ["string"],
  "interviewTips": ["string"],
  "recommendedJobs": [{"id":"string","title":"string","department":"string","matchLevel":"高|较高|中等|较低","reason":"string"}]
}`;

  const data = await callDeepSeekServer({
    temperature: 0.1,
    maxTokens: 1800,
    messages: [
      {
        role: "system",
        content: "你是招聘简历解析器。只根据用户提供的简历文本和岗位 JD 提取信息与生成建议，不要编造学校、公司、项目、技能。无法识别就写“未识别”或空数组。只返回合法 JSON，不要 Markdown。候选人端禁止出现鹅值、鸽值、鸽鹅机制、画像、流失风险、百分位。"
      },
      {
        role: "user",
        content: `请解析以下简历并返回严格 JSON，必须符合 schema：\n${schema}\n\n候选岗位列表：\n${JSON.stringify(jobs, null, 2)}\n\n简历文本：\n${cleanedResumeText.slice(0, 18000)}`
      }
    ]
  });

  const content = getDeepSeekServerText(data);
  return normalizeCandidateProfile(parseJsonFromModelText(content));
}
