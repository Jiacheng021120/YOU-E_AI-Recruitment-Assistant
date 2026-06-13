import { seedScheduledInterviews } from "@/data/interviewers";
import type { ScheduledInterview } from "@/data/interviewers";

export type Role = "candidate" | "hr" | "business";
export type Stage = "talent" | "job" | "evaluating" | "interviewing" | "passed" | "onboarded" | "lost";

export type Candidate = {
  id: string;
  name: string;
  applicationType: "日常实习" | "暑期实习" | "校园招聘" | "社招";
  graduationYear: string;
  expectedGraduationDate?: string;
  school: string;
  major: string;
  city: string;
  education: string;
  internships: string;
  projects: string[];
  skills: string[];
  targetRoles: string[];
  targetDirection: "招聘" | "文化" | "绩效" | "数据" | "技术";
  appliedRole: string;
  currentStage: Stage;
  evaluationStatus: string;
  interviewStatus: string;
  offerStatus: string;
  gooseScore: number;
  pigeonScore: number;
  goosePercentile: number;
  pigeonPercentile: number;
  personaType: string;
  avatarType: string;
  resumeSummary: string;
  availableSlots: string[];
  communicationStatus: string;
  interviewHistory: string[];
  riskReasons: string[];
  recommendationAction: string;
  logs: string[];
  scoreChangeReasons: string[];
  rescheduleCount: number;
  hasOtherOffer: boolean;
  waitingHours: number;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  resumeAnalysisStatus: "not_uploaded" | "analyzing" | "completed" | "failed";
  resumeAnalysis?: {
    summary: string;
    strengths: string[];
    recommendedRoles: {
      roleId: string;
      roleTitle: string;
      matchLevel: "较低" | "中等" | "较高" | "高";
      reason: string;
    }[];
    optimizationTips: string[];
    interviewTips: string[];
  };
  activeJobId?: string;
  activeApplicationStage?: "none" | "applied" | "evaluation" | "interview" | "passed" | "onboarded" | "rejected" | "cancelled";
  interviewPreference?: {
    preferredStyle?: string[];
    avoidStyle?: string[];
  };
};

export type CandidateProfile = {
  name: string;
  school: string;
  major: string;
  education: string;
  city: string;
  graduationYear: string;
  internships: string[];
  projects: string[];
  skills: string[];
  targetRoles: string[];
  resumeSummary: string;
  strengths: string[];
  weaknesses: string[];
  optimizationTips: string[];
  interviewTips: string[];
  recommendedJobs: {
    id: string;
    title: string;
    department: string;
    matchLevel: "高" | "较高" | "中等" | "较低";
    reason: string;
  }[];
};

export type Interviewer = {
  id: string;
  name: string;
  role: string;
  level: string;
  department: string;
  isExecutive: boolean;
  canEvaluateCandidates: boolean;
  group: string;
  interviewSkills: string[];
  interviewPreferences: string[];
  roleDirections: string[];
  availableSlots: string[];
  scheduledInterviews: string[];
  scheduledCount: number;
  avatar: string;
};

export type Job = {
  id: string;
  title: string;
  department: string;
  businessDirection: "招聘" | "文化" | "绩效" | "数据" | "技术";
  hcTarget: number;
  hcFilled: number;
  urgency: string;
  jd: string;
  requiredSkills: string[];
  preferredInterviewerLevels: ("P1" | "P2" | "P3")[];
  requiresLeaderFirst?: boolean;
  leaderName?: string;
  preferredBackground: string;
  candidates: string[];
  riskScore: number;
  completionRate: number;
};

export type AppState = {
  candidates: Candidate[];
  interviewers: Interviewer[];
  jobs: Job[];
  scheduledInterviews: ScheduledInterview[];
  notifications: string[];
};

export const modelName = "DeepSeek V4";

export function mockAIResponse(prompt: string) {
  return `【${modelName} mock】${prompt}：已完成模型理解与规则判断。`;
}

export function hasActiveInterviewProcess(candidate: Pick<Candidate, "activeApplicationStage">) {
  return ["applied", "evaluation", "interview", "passed"].includes(candidate.activeApplicationStage ?? "none");
}

export function applicationStageFromStage(stage: Stage): Candidate["activeApplicationStage"] {
  if (stage === "job" || stage === "talent") return "applied";
  if (stage === "evaluating") return "evaluation";
  if (stage === "interviewing") return "interview";
  if (stage === "passed") return "passed";
  if (stage === "onboarded") return "onboarded";
  if (stage === "lost") return "cancelled";
  return "none";
}

export function mockResumeAnalysis(fileName = "候选人简历.pdf"): NonNullable<Candidate["resumeAnalysis"]> {
  return {
    summary: `已完成 ${fileName} 的模拟解析。简历呈现出较好的项目推进、数据复盘和跨团队沟通能力，适合从运营、增长和数据分析方向优先探索。`,
    strengths: ["有完整项目经历描述", "能体现数据意识和复盘习惯", "具备跨团队沟通与执行闭环经验"],
    recommendedRoles: [
      { roleId: "j1", roleTitle: "产品运营实习生", matchLevel: "较高", reason: "项目复盘、用户增长和沟通协作经历与岗位要求接近。" },
      { roleId: "j5", roleTitle: "用户增长实习生", matchLevel: "较高", reason: "增长活动、渠道分析和用户洞察能力可迁移。" },
      { roleId: "j2", roleTitle: "数据分析实习生", matchLevel: "中等", reason: "具备数据意识，但建议补充 SQL 或指标体系案例。" },
      { roleId: "j4", roleTitle: "前端开发实习生", matchLevel: "较低", reason: "当前简历技术项目证据不足，暂不建议作为主方向。" }
    ],
    optimizationTips: ["把经历写成“动作 + 方法 + 结果”的结构", "补充 1-2 个量化指标", "把与目标岗位相关的工具和方法前置展示"],
    interviewTips: ["准备一个完整项目复盘案例", "准备一次跨团队协作推进案例", "提前梳理为什么想投递该岗位"]
  };
}

export function parseResumeMock(fileName = "候选人简历.pdf"): CandidateProfile {
  const lower = fileName.toLowerCase();
  if (lower.includes("data") || lower.includes("analysis") || fileName.includes("数据")) {
    return {
      name: "沈星澜",
      school: "复旦大学",
      major: "统计学",
      education: "本科",
      city: "上海",
      graduationYear: "2027",
      internships: ["咨询公司数据分析实习", "校园商业分析项目负责人"],
      projects: ["电商转化漏斗分析", "用户分层看板搭建", "A/B 实验效果评估"],
      skills: ["SQL", "Excel", "Python", "指标体系", "可视化"],
      targetRoles: ["数据分析实习生", "商业分析实习生", "用户增长实习生"],
      resumeSummary: "候选人具备统计学背景和数据分析实习经历，能围绕业务问题搭建指标、分析漏斗并输出策略建议，适合优先关注数据分析和增长分析方向。",
      strengths: ["数据分析链路完整", "SQL 与可视化基础较扎实", "能把分析结论转化为业务建议"],
      weaknesses: ["可补充更多实验设计细节", "项目结果指标还可以更量化", "需要强化跨团队沟通案例"],
      optimizationTips: ["补充每个分析项目的目标、样本量和业务结果", "把 SQL、看板、指标体系能力放到简历前部", "用 1-2 个案例说明分析结论如何影响业务动作"],
      interviewTips: ["准备一个完整漏斗分析案例", "复盘一次指标异常定位过程", "准备 SQL 基础和业务口径追问"],
      recommendedJobs: [
        { id: "j2", title: "数据分析实习生", department: "数据平台", matchLevel: "高", reason: "统计背景、SQL、指标体系和看板项目与岗位要求高度相关。" },
        { id: "j5", title: "用户增长实习生", department: "市场增长", matchLevel: "较高", reason: "A/B 实验和用户分层经验可迁移到增长策略分析。" },
        { id: "j1", title: "产品运营实习生", department: "产品增长", matchLevel: "中等", reason: "具备数据复盘能力，但需要补充更多运营执行经验。" }
      ]
    };
  }
  if (lower.includes("frontend") || lower.includes("react") || fileName.includes("前端")) {
    return {
      name: "许今朝",
      school: "上海交通大学",
      major: "软件工程",
      education: "本科",
      city: "上海",
      graduationYear: "2027",
      internships: ["前端工程实习", "校园组件库项目维护者"],
      projects: ["React 招聘后台页面", "低代码表单搭建器", "组件库与数据看板"],
      skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "工程能力"],
      targetRoles: ["前端开发实习生", "研发效能实习生", "产品运营实习生"],
      resumeSummary: "候选人具备较完整的前端项目经验，熟悉 React、TypeScript 和组件化开发，能独立实现后台页面和数据看板，适合优先关注前端开发方向。",
      strengths: ["前端技术栈与岗位贴合", "有组件化和后台系统项目", "能描述工程效率和交互体验"],
      weaknesses: ["需要补充项目性能指标", "建议增加代码质量或测试相关描述", "业务理解案例相对不足"],
      optimizationTips: ["突出 React / TypeScript 项目中的个人贡献", "补充页面性能、复用率或开发效率等结果数据", "把项目截图、GitHub 或在线演示链接放到简历显眼位置"],
      interviewTips: ["准备组件设计和状态管理案例", "复习 React hooks、性能优化和 TypeScript 类型设计", "准备一个从需求到上线的完整项目讲述"],
      recommendedJobs: [
        { id: "j4", title: "前端开发实习生", department: "研发效能", matchLevel: "高", reason: "React、TypeScript、后台页面和组件库经历与岗位要求高度匹配。" },
        { id: "j2", title: "数据分析实习生", department: "数据平台", matchLevel: "中等", reason: "有数据看板项目，但分析方法和 SQL 证据较少。" },
        { id: "j1", title: "产品运营实习生", department: "产品增长", matchLevel: "较低", reason: "技术项目较强，但运营项目证据不足。" }
      ]
    };
  }
  return {
    name: "林栖羽",
    school: "浙江大学",
    major: "信息管理",
    education: "硕士",
    city: "杭州",
    graduationYear: "2026",
    internships: ["互联网产品运营实习", "校园增长负责人"],
    projects: ["校园活动增长复盘", "用户调研与需求整理", "社群转化路径优化"],
    skills: ["用户增长", "数据分析", "项目复盘", "Excel", "用户调研"],
    targetRoles: ["产品运营实习生", "用户增长实习生", "数据分析实习生"],
    resumeSummary: "候选人具备产品运营和校园增长经历，能结合用户调研、活动执行和数据复盘推动转化优化，适合优先关注产品运营与用户增长方向。",
    strengths: ["产品运营经历与目标岗位贴合", "具备用户调研和数据复盘意识", "有跨团队推进和活动落地经验"],
    weaknesses: ["建议补充更具体的转化结果", "数据工具能力可以写得更明确", "项目影响范围和个人贡献可进一步区分"],
    optimizationTips: ["把实习经历改写成“动作 + 方法 + 结果”", "补充活动参与人数、转化率、留存等量化指标", "将用户调研、数据复盘和跨团队协作能力前置展示"],
    interviewTips: ["准备一个完整产品运营项目复盘", "准备一次用户调研如何影响策略的案例", "提前梳理为什么优先选择产品运营方向"],
    recommendedJobs: [
      { id: "j1", title: "产品运营实习生", department: "产品增长", matchLevel: "高", reason: "运营实习、用户调研和项目复盘经历与岗位职责高度相关。" },
      { id: "j5", title: "用户增长实习生", department: "市场增长", matchLevel: "较高", reason: "校园增长和转化路径优化经验可直接迁移。" },
      { id: "j2", title: "数据分析实习生", department: "数据平台", matchLevel: "中等", reason: "具备数据意识，但建议补充 SQL 或指标体系案例。" }
    ]
  };
}

export const stages: Stage[] = ["talent", "job", "evaluating", "interviewing", "passed", "onboarded"];

export const stageLabel: Record<Stage, string> = {
  talent: "人才库",
  job: "岗位候选人",
  evaluating: "评估中",
  interviewing: "面试中",
  passed: "面试通过",
  onboarded: "已入职",
  lost: "已流失"
};

export function personaFromScores(goose: number, pigeon: number) {
  const g = gooseLevel(goose);
  const p = pigeonLevel(pigeon);
  const map: Record<string, string> = {
    "高-低": "镇巢鹅",
    "高-较低": "金羽鹅",
    "高-较高": "惊羽鹅",
    "高-高": "临飞鹅",
    "较高-低": "稳行鹅",
    "较高-较低": "候场鹅",
    "较高-较高": "警戒鹅",
    "较高-高": "断线鸽",
    "较低-低": "安栖鹅",
    "较低-较低": "摇摆鸽",
    "较低-较高": "观察鸽",
    "较低-高": "迷航鸽",
    "低-高": "远飞鸽",
    "低-较高": "躁动鸽",
    "低-较低": "过路鸽",
    "低-低": "静默鸽"
  };
  return map[`${g}-${p}`];
}

export function gooseLevel(score: number) {
  return score >= 85 ? "高" : score >= 70 ? "较高" : score >= 50 ? "较低" : "低";
}

export function pigeonLevel(score: number) {
  return score >= 85 ? "高" : score >= 70 ? "较高" : score >= 45 ? "较低" : "低";
}

export function personaSpecies(persona: string) {
  return persona.endsWith("鹅") ? "goose" : "pigeon";
}

export const personaRows = ["鹅值高", "鹅值较高", "鹅值较低", "鹅值低"];
export const personaCols = ["鸽值低", "鸽值较低", "鸽值较高", "鸽值高"];
export const personaMatrix = [
  ["镇巢鹅", "金羽鹅", "惊羽鹅", "临飞鹅"],
  ["稳行鹅", "候场鹅", "警戒鹅", "断线鸽"],
  ["安栖鹅", "摇摆鸽", "观察鸽", "迷航鸽"],
  ["静默鸽", "过路鸽", "躁动鸽", "远飞鸽"]
] as const;

const slots = ["周一 09:00-10:00", "周一 14:00-15:00", "周二 10:00-11:00", "周三 15:00-16:00", "周四 16:00-17:00", "周五 14:00-15:00"];

export const initialInterviewers: Interviewer[] = [
  ["i1", "李一鸣", "产品总监", "P8", "产品", true, true, "增长一组", ["产品设计", "用户增长", "业务判断"], ["先看业务判断", "偏好有项目复盘的人"], ["产品运营实习生", "用户增长实习生"], "🪶", 1],
  ["i2", "王可欣", "高级产品经理", "P7", "产品", false, true, "增长一组", ["产品运营", "数据分析", "项目复盘"], ["喜欢结构化表达", "重视数据复盘"], ["产品运营实习生"], "🎯", 2],
  ["i3", "陈子墨", "交互设计师", "P6", "设计", false, false, "体验组", ["设计表达", "用户体验"], ["关注用户意识", "偏好作品完整"], ["产品运营实习生"], "🎨", 1],
  ["i4", "刘思远", "技术负责人", "P8", "研发", true, true, "前端组", ["前端", "系统设计", "工程能力", "React", "TypeScript"], ["先看工程深度", "关注代码质量"], ["前端开发实习生"], "⚙", 1],
  ["i5", "赵安琪", "HRBP", "P7", "人力", false, true, "组织组", ["组织匹配", "稳定性", "动机判断"], ["重点确认稳定性", "关注到岗时间"], ["产品运营实习生", "用户增长实习生"], "📞", 3],
  ["i6", "周嘉禾", "数据分析负责人", "P8", "数据", true, true, "数据组", ["SQL", "数据分析", "指标体系", "可视化"], ["偏好指标意识", "关注 SQL 基础"], ["数据分析实习生"], "📊", 2],
  ["i7", "孙若琳", "内容运营专家", "P6", "运营", false, false, "内容组", ["内容策略", "活动运营", "文案"], ["喜欢内容敏感度", "关注执行闭环"], ["内容运营实习生"], "✍", 0],
  ["i8", "黄景辰", "市场增长负责人", "P8", "市场", true, true, "增长二组", ["增长策略", "用户洞察", "A/B 测试"], ["偏好增长实验", "关注用户洞察"], ["用户增长实习生"], "🚀", 2]
].map(([id, name, role, level, department, isExecutive, canEvaluateCandidates, group, interviewSkills, interviewPreferences, roleDirections, avatar, scheduledCount], index) => ({
  id: id as string,
  name: name as string,
  role: role as string,
  level: level as string,
  department: department as string,
  isExecutive: isExecutive as boolean,
  canEvaluateCandidates: canEvaluateCandidates as boolean,
  group: group as string,
  interviewSkills: interviewSkills as string[],
  interviewPreferences: interviewPreferences as string[],
  roleDirections: roleDirections as string[],
  availableSlots: slots.slice(index % 3, index % 3 + 4),
  scheduledInterviews: [],
  scheduledCount: scheduledCount as number,
  avatar: avatar as string
}));

export const initialJobs: Job[] = [
  ["j1", "产品运营实习生", "产品增长", 4, 1, "高", "负责用户增长活动、需求收集、指标复盘和跨团队推进。", ["用户增长", "数据分析", "项目复盘"], "互联网产品或校园增长项目", 76],
  ["j2", "数据分析实习生", "数据平台", 3, 1, "中", "搭建业务指标看板，分析转化漏斗，支持策略实验。", ["SQL", "指标体系", "可视化"], "统计、数分、商分经历", 58],
  ["j3", "内容运营实习生", "内容生态", 3, 0, "中", "负责内容选题、活动策划、社群维护和效果追踪。", ["内容策略", "活动运营", "文案"], "内容平台或新媒体经历", 64],
  ["j4", "前端开发实习生", "研发效能", 2, 0, "高", "建设招聘平台组件、数据看板和交互工具。", ["React", "TypeScript", "工程能力"], "前端项目或开源经历", 70],
  ["j5", "用户增长实习生", "市场增长", 3, 1, "高", "设计增长实验，分析渠道质量，推动拉新和转化。", ["增长策略", "用户洞察", "A/B 测试"], "增长、市场或数据项目", 82]
].map(([id, title, department, hcTarget, hcFilled, urgency, jd, requiredSkills, preferredBackground, riskScore]) => ({
  id: id as string,
  title: title as string,
  department: department as string,
  businessDirection: businessDirectionFromTitle(title as string, department as string),
  hcTarget: hcTarget as number,
  hcFilled: hcFilled as number,
  urgency: urgency as string,
  jd: jd as string,
  requiredSkills: requiredSkills as string[],
  preferredInterviewerLevels: urgency === "高" ? ["P1", "P2"] : ["P2", "P3"],
  requiresLeaderFirst: urgency === "高",
  leaderName: urgency === "高" ? leaderNameFromDirection(businessDirectionFromTitle(title as string, department as string)) : undefined,
  preferredBackground: preferredBackground as string,
  candidates: [],
  riskScore: riskScore as number,
  completionRate: Math.round(((hcFilled as number) / (hcTarget as number)) * 100)
}));

const rawCandidates = [
  ["c1", "林栖羽", "浙江大学", "信息管理", "杭州", "硕士", "字节产品运营、校园增长负责人", ["用户增长", "数据分析", "项目复盘"], "产品运营实习生", "evaluating", 93, 88, "立即推进"],
  ["c2", "沈星澜", "复旦大学", "统计学", "上海", "本科", "咨询数据分析、SQL 看板", ["SQL", "指标体系", "可视化"], "数据分析实习生", "interviewing", 91, 34, "立即推进"],
  ["c3", "周予安", "南京大学", "新闻传播", "南京", "本科", "内容平台实习、社群运营", ["内容策略", "活动运营", "文案"], "内容运营实习生", "job", 78, 73, "重点跟进"],
  ["c4", "许今朝", "上海交通大学", "软件工程", "上海", "本科", "React 后台系统、组件库", ["React", "TypeScript", "工程能力"], "前端开发实习生", "evaluating", 88, 52, "立即推进"],
  ["c5", "陈向晚", "武汉大学", "市场营销", "武汉", "本科", "增长实验、渠道投放", ["增长策略", "用户洞察", "A/B 测试"], "用户增长实习生", "passed", 86, 79, "重点抢救"],
  ["c6", "孟知夏", "中国人民大学", "人力资源", "北京", "硕士", "HRBP 项目、组织调研", ["组织匹配", "沟通协作"], "产品运营实习生", "talent", 61, 42, "入库观察"],
  ["c7", "顾北辰", "同济大学", "工业设计", "上海", "本科", "交互原型、用户访谈", ["用户体验", "设计表达"], "产品运营实习生", "job", 67, 91, "谨慎投入"],
  ["c8", "唐若宁", "厦门大学", "广告学", "厦门", "本科", "新媒体账号、内容增长", ["文案", "活动运营"], "内容运营实习生", "lost", 44, 96, "减少投入"],
  ["c9", "陆景和", "北京邮电大学", "计算机", "北京", "本科", "前端低代码、性能优化", ["React", "TypeScript"], "前端开发实习生", "job", 82, 28, "立即推进"],
  ["c10", "苏念", "中山大学", "经济学", "广州", "本科", "商业分析、用户研究", ["数据分析", "用户洞察"], "用户增长实习生", "interviewing", 72, 63, "重点跟进"],
  ["c11", "叶青舟", "华东师范大学", "心理学", "上海", "硕士", "用户研究、问卷建模", ["用户洞察", "数据分析"], "产品运营实习生", "talent", 58, 81, "暂缓推进"],
  ["c12", "秦越", "哈尔滨工业大学", "软件工程", "深圳", "本科", "工程工具链、测试平台", ["工程能力", "系统设计"], "前端开发实习生", "job", 76, 18, "立即推进"],
  ["c13", "宋清梨", "北京大学", "中文", "北京", "本科", "内容栏目、活动策划", ["内容策略", "文案"], "内容运营实习生", "passed", 84, 22, "稳步推进"],
  ["c14", "韩屿", "西安交通大学", "自动化", "西安", "本科", "数据采集、BI 分析", ["SQL", "可视化"], "数据分析实习生", "evaluating", 69, 47, "入库观察"],
  ["c15", "程一诺", "华南理工大学", "电子商务", "广州", "本科", "私域增长、用户分层", ["增长策略", "活动运营"], "用户增长实习生", "job", 53, 59, "观察"],
  ["c16", "姜眠", "四川大学", "新闻学", "成都", "本科", "校园媒体、热点策划", ["文案", "内容策略"], "内容运营实习生", "talent", 49, 35, "入库观察"],
  ["c17", "魏知秋", "清华大学", "数据科学", "北京", "硕士", "推荐系统评估、实验分析", ["SQL", "指标体系", "A/B 测试"], "数据分析实习生", "interviewing", 95, 76, "重点抢救"],
  ["c18", "何南枝", "南开大学", "工商管理", "天津", "本科", "校园品牌、活动执行", ["项目复盘", "沟通协作"], "产品运营实习生", "onboarded", 74, 16, "成功鸽鹅画像"],
  ["c19", "罗听澜", "吉林大学", "计算机", "长春", "本科", "课程项目、静态页面", ["React"], "前端开发实习生", "talent", 38, 72, "减少投入"],
  ["c20", "尹舟", "中央财经大学", "金融工程", "北京", "硕士", "策略分析、仪表盘", ["数据分析", "可视化"], "用户增长实习生", "job", 64, 87, "快速判断"]
] as const;

export const initialCandidates: Candidate[] = rawCandidates.map((row, index) => {
  const [id, name, school, major, city, education, internships, skills, appliedRole, currentStage, gooseScore, pigeonScore, recommendationAction] = row;
  const personaType = personaFromScores(gooseScore, pigeonScore);
  return {
    id,
    name,
    applicationType: applicationTypeForIndex(index),
    graduationYear: graduationYearForIndex(index),
    expectedGraduationDate: `${graduationYearForIndex(index)}-06`,
    school,
    major,
    city,
    education,
    internships,
    projects: projectHints(appliedRole as string, internships as string),
    skills: [...skills],
    targetRoles: [appliedRole, index % 2 ? "产品运营实习生" : "用户增长实习生"],
    targetDirection: businessDirectionFromTitle(appliedRole as string, ""),
    appliedRole,
    currentStage,
    evaluationStatus: currentStage === "evaluating" ? "待业务反馈" : currentStage === "interviewing" ? "业务通过" : "未评估",
    interviewStatus: currentStage === "interviewing" ? "待面试" : "未安排",
    offerStatus: currentStage === "passed" ? (index % 2 ? "已发 offer" : "候选人犹豫") : currentStage === "lost" ? "已鸽" : "未开始",
    gooseScore,
    pigeonScore,
    goosePercentile: Math.min(98, gooseScore + (index % 7)),
    pigeonPercentile: Math.min(99, pigeonScore + (index % 5)),
    personaType,
    avatarType: personaType,
    resumeSummary: `${school}${major}${education}，有${internships}经历，核心技能为${skills.join("、")}。`,
    availableSlots: slots.slice(index % 4, index % 4 + 3),
    communicationStatus: pigeonScore > 75 ? "回复变慢，存在外部机会" : pigeonScore < 35 ? "回复稳定，意愿明确" : "正常沟通",
    interviewHistory: currentStage === "interviewing" ? ["AI 已安排一面", "等待面试官反馈"] : [],
    riskReasons: pigeonScore > 75 ? ["等待时间偏长", "可能有其他 offer", "需要加速推进"] : pigeonScore > 50 ? ["意愿需要确认", "流程不宜拖延"] : ["风险较低", "时间配合度高"],
    recommendationAction,
    logs: [`候选人进入${stageLabel[currentStage]}阶段`, `鸽鹅机制生成画像：${personaType}`],
    scoreChangeReasons: [
      "鹅值模拟因子：学校与专业匹配、实习经历、项目经历、技能关键词、岗位 JD 匹配、到岗时间、业务方偏好、面试反馈。",
      `鸽值模拟因子：当前阶段等待 ${24 + index * 3} 小时、回复速度、改面次数、其他机会、offer 犹豫、排期困难和业务反馈延迟。`
    ],
    rescheduleCount: index % 3,
    hasOtherOffer: pigeonScore > 78,
    waitingHours: 24 + index * 3,
    resumeFileName: id === "c1" ? "林栖羽-产品运营简历.pdf" : undefined,
    resumeUploadedAt: id === "c1" ? "2026-06-13 09:30" : undefined,
    resumeAnalysisStatus: id === "c1" ? "completed" : "not_uploaded",
    resumeAnalysis: id === "c1" ? mockResumeAnalysis("林栖羽-产品运营简历.pdf") : undefined,
    activeJobId: id === "c1" ? "j1" : undefined,
    activeApplicationStage: id === "c1" ? applicationStageFromStage(currentStage) : "none",
    interviewPreference: {
      preferredStyle: stylePreferenceFromRole(appliedRole as string),
      avoidStyle: []
    }
  };
});

function applicationTypeForIndex(index: number): Candidate["applicationType"] {
  return (["日常实习", "暑期实习", "校园招聘", "社招"] as const)[index % 4];
}

function graduationYearForIndex(index: number) {
  return String(2026 + (index % 4));
}

export function businessDirectionFromTitle(title: string, department = ""): Job["businessDirection"] {
  if (title.includes("数据") || department.includes("数据")) return "数据";
  if (title.includes("前端") || department.includes("研发")) return "技术";
  if (title.includes("内容") || department.includes("文化")) return "文化";
  if (title.includes("绩效")) return "绩效";
  return "招聘";
}

function leaderNameFromDirection(direction: Job["businessDirection"]) {
  const map: Record<Job["businessDirection"], string> = {
    招聘: "李一鸣",
    数据: "周嘉禾",
    技术: "刘思远",
    文化: "赵安琪",
    绩效: "陈秉文"
  };
  return map[direction];
}

function projectHints(role: string, internships: string) {
  if (role.includes("数据")) return ["转化漏斗分析", "业务指标看板", "A/B 实验复盘"];
  if (role.includes("前端")) return ["React 后台系统", "低代码表单", "组件库建设"];
  if (role.includes("内容")) return ["内容选题策划", "社群活动运营", "热点内容复盘"];
  if (role.includes("增长")) return ["渠道增长实验", "用户分层运营", "增长数据复盘"];
  return [`${internships}复盘`, "用户调研与需求整理", "跨团队项目推进"];
}

function stylePreferenceFromRole(role: string) {
  if (role.includes("数据")) return ["数据导向", "逻辑严谨", "指标拆解"];
  if (role.includes("前端")) return ["技术深挖", "架构能力", "代码规范"];
  if (role.includes("内容")) return ["温和深入", "用户洞察", "表达清晰"];
  return ["结构化", "业务理解", "用户体验"];
}

export const initialState: AppState = {
  candidates: initialCandidates,
  interviewers: initialInterviewers,
  jobs: initialJobs.map((job) => ({
    ...job,
    candidates: initialCandidates.filter((candidate) => candidate.appliedRole === job.title).map((candidate) => candidate.id)
  })),
  scheduledInterviews: seedScheduledInterviews,
  notifications: [
    "YOU鹅 已通过鸽鹅机制识别 4 位高鹅值高鸽值候选人",
    "一键约面改面 Agent 建议优先处理产品运营实习生岗位",
    "DeepSeek V4 mock 已生成数据分析实习生岗位评估摘要"
  ]
};
