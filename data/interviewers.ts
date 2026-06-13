export type ScheduledInterview = {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  interviewerId: string;
  interviewerName: string;
  interviewTime: string;
  round: "一面" | "二面" | "终面";
  status: "待面试" | "已完成" | "待反馈" | "已改面" | "已取消";
};

export type Interviewer = {
  id: string;
  name: string;
  level: "P1" | "P2" | "P3";
  jobRole: string;
  businessDirection: "招聘" | "文化" | "绩效" | "数据" | "技术";
  managerName?: string;
  availableSlots: string[];
  personalStyle: string;
  skills: string[];
  group?: string;
  canEvaluate: boolean;
  scheduledInterviews?: ScheduledInterview[];
  schedulePreference?: string;
  maxInterviewsPerWeek?: number;
  maxInterviewsPerDay?: number;
  preferredTimeOfDay?: "上午" | "下午" | "不限";
  blockedDays?: string[];
};

const slots = [
  "周一 10:00-11:00",
  "周一 14:00-15:00",
  "周二 10:00-11:00",
  "周二 16:00-17:00",
  "周三 15:00-16:00",
  "周四 10:00-11:00",
  "周四 16:00-17:00",
  "周五 14:00-15:00"
];

export const seedScheduledInterviews: ScheduledInterview[] = [
  { id: "si001", candidateId: "c1", candidateName: "林栖羽", jobId: "j1", jobTitle: "产品运营实习生", interviewerId: "iv001", interviewerName: "李一鸣", interviewTime: "周一 14:00-15:00", round: "终面", status: "待面试" },
  { id: "si002", candidateId: "c6", candidateName: "孟知夏", jobId: "j1", jobTitle: "产品运营实习生", interviewerId: "iv001", interviewerName: "李一鸣", interviewTime: "周三 15:00-16:00", round: "一面", status: "待反馈" },
  { id: "si003", candidateId: "c2", candidateName: "沈星澜", jobId: "j2", jobTitle: "数据分析实习生", interviewerId: "iv002", interviewerName: "周嘉禾", interviewTime: "周二 10:00-11:00", round: "终面", status: "待面试" },
  { id: "si004", candidateId: "c17", candidateName: "魏知秋", jobId: "j2", jobTitle: "数据分析实习生", interviewerId: "iv002", interviewerName: "周嘉禾", interviewTime: "周四 16:00-17:00", round: "二面", status: "待反馈" },
  { id: "si005", candidateId: "c4", candidateName: "许今朝", jobId: "j4", jobTitle: "前端开发实习生", interviewerId: "iv003", interviewerName: "刘思远", interviewTime: "周五 14:00-15:00", round: "终面", status: "待面试" },
  { id: "si006", candidateId: "c12", candidateName: "秦越", jobId: "j4", jobTitle: "前端开发实习生", interviewerId: "iv010", interviewerName: "秦越", interviewTime: "周一 10:00-11:00", round: "一面", status: "待面试" },
  { id: "si007", candidateId: "c3", candidateName: "周予安", jobId: "j3", jobTitle: "内容运营实习生", interviewerId: "iv012", interviewerName: "叶青舟", interviewTime: "周二 16:00-17:00", round: "一面", status: "待面试" },
  { id: "si008", candidateId: "c13", candidateName: "宋清梨", jobId: "j3", jobTitle: "内容运营实习生", interviewerId: "iv016", interviewerName: "林栖羽", interviewTime: "周三 15:00-16:00", round: "二面", status: "待反馈" },
  { id: "si009", candidateId: "c5", candidateName: "陈向晚", jobId: "j5", jobTitle: "用户增长实习生", interviewerId: "iv006", interviewerName: "王可欣", interviewTime: "周四 10:00-11:00", round: "一面", status: "待面试" },
  { id: "si010", candidateId: "c10", candidateName: "苏念", jobId: "j5", jobTitle: "用户增长实习生", interviewerId: "iv008", interviewerName: "顾云岚", interviewTime: "周五 14:00-15:00", round: "二面", status: "已改面" },
  { id: "si011", candidateId: "c14", candidateName: "韩屿", jobId: "j2", jobTitle: "数据分析实习生", interviewerId: "iv009", interviewerName: "陆景辰", interviewTime: "周一 14:00-15:00", round: "一面", status: "待面试" },
  { id: "si012", candidateId: "c9", candidateName: "陆景和", jobId: "j4", jobTitle: "前端开发实习生", interviewerId: "iv017", interviewerName: "沈星澜", interviewTime: "周二 10:00-11:00", round: "一面", status: "待面试" },
  { id: "si013", candidateId: "c20", candidateName: "尹舟", jobId: "j5", jobTitle: "用户增长实习生", interviewerId: "iv024", interviewerName: "顾北辰", interviewTime: "周四 16:00-17:00", round: "二面", status: "待面试" },
  { id: "si014", candidateId: "c15", candidateName: "程一诺", jobId: "j5", jobTitle: "用户增长实习生", interviewerId: "iv025", interviewerName: "秦怀瑾", interviewTime: "周三 15:00-16:00", round: "一面", status: "待反馈" }
];

const rows: Omit<Interviewer, "availableSlots" | "scheduledInterviews">[] = [
  { id: "iv001", name: "李一鸣", level: "P1", jobRole: "招聘平台负责人", businessDirection: "招聘", personalStyle: "结构化、业务理解、流程判断", skills: ["招聘流程", "产品设计", "AI应用", "业务判断"], group: "招聘平台", canEvaluate: true },
  { id: "iv002", name: "周嘉禾", level: "P1", jobRole: "数据平台负责人", businessDirection: "数据", personalStyle: "数据导向、逻辑严谨、指标拆解", skills: ["数据分析", "指标体系", "SQL", "可视化"], group: "数据平台", canEvaluate: true },
  { id: "iv003", name: "刘思远", level: "P1", jobRole: "技术负责人", businessDirection: "技术", personalStyle: "技术深挖、架构能力、代码规范", skills: ["前端", "后端", "系统设计", "React", "TypeScript"], group: "技术平台", canEvaluate: true },
  { id: "iv004", name: "赵安琪", level: "P1", jobRole: "组织文化负责人", businessDirection: "文化", personalStyle: "温和深入、价值观、动机判断", skills: ["组织文化", "动机判断", "沟通协作"], group: "组织文化", canEvaluate: true },
  { id: "iv005", name: "陈秉文", level: "P1", jobRole: "绩效系统负责人", businessDirection: "绩效", personalStyle: "目标拆解、结果导向、系统思维", skills: ["绩效系统", "目标管理", "组织诊断"], group: "绩效系统", canEvaluate: true },
  { id: "iv006", name: "王可欣", level: "P2", managerName: "李一鸣", jobRole: "招聘产品经理", businessDirection: "招聘", personalStyle: "结构化、用户体验、流程优化", skills: ["招聘流程", "产品运营", "用户体验", "项目复盘"], group: "招聘平台", canEvaluate: true },
  { id: "iv007", name: "沈亦舟", level: "P2", managerName: "李一鸣", jobRole: "招聘运营专家", businessDirection: "招聘", personalStyle: "业务理解、沟通推进、候选人体验", skills: ["招聘运营", "候选人体验", "流程设计"], group: "招聘平台", canEvaluate: true },
  { id: "iv008", name: "顾云岚", level: "P2", managerName: "周嘉禾", jobRole: "数据分析专家", businessDirection: "数据", personalStyle: "数据导向、指标拆解、逻辑严谨", skills: ["SQL", "数据分析", "指标体系", "A/B 测试"], group: "数据平台", canEvaluate: true },
  { id: "iv009", name: "陆景辰", level: "P2", managerName: "周嘉禾", jobRole: "商业分析专家", businessDirection: "数据", personalStyle: "业务建模、结论清晰、追问严谨", skills: ["商业分析", "可视化", "数据分析"], group: "数据平台", canEvaluate: true },
  { id: "iv010", name: "秦越", level: "P2", managerName: "刘思远", jobRole: "前端架构师", businessDirection: "技术", personalStyle: "技术深挖、代码规范、工程质量", skills: ["前端", "React", "TypeScript", "工程能力"], group: "技术平台", canEvaluate: true },
  { id: "iv011", name: "许今朝", level: "P2", managerName: "刘思远", jobRole: "后端架构师", businessDirection: "技术", personalStyle: "架构能力、稳定性、技术深挖", skills: ["后端", "系统设计", "服务稳定性"], group: "技术平台", canEvaluate: true },
  { id: "iv012", name: "叶青舟", level: "P2", managerName: "赵安琪", jobRole: "文化项目专家", businessDirection: "文化", personalStyle: "温和深入、价值观、组织理解", skills: ["组织文化", "员工体验", "价值观"], group: "组织文化", canEvaluate: true },
  { id: "iv013", name: "孟知夏", level: "P2", managerName: "赵安琪", jobRole: "HRBP 专家", businessDirection: "文化", personalStyle: "动机判断、沟通协作、稳定性确认", skills: ["组织匹配", "动机判断", "沟通协作"], group: "组织文化", canEvaluate: true },
  { id: "iv014", name: "宋清梨", level: "P2", managerName: "陈秉文", jobRole: "绩效产品专家", businessDirection: "绩效", personalStyle: "目标拆解、结果导向、结构化", skills: ["绩效系统", "产品设计", "目标管理"], group: "绩效系统", canEvaluate: true },
  { id: "iv015", name: "韩屿", level: "P2", managerName: "陈秉文", jobRole: "组织绩效分析师", businessDirection: "绩效", personalStyle: "指标拆解、数据导向、系统思维", skills: ["绩效分析", "数据分析", "组织诊断"], group: "绩效系统", canEvaluate: true }
];

const p3Names = ["林栖羽", "沈星澜", "周予安", "许今朝", "陈向晚", "唐若宁", "苏念", "姜眠", "魏知秋", "罗听澜", "尹舟", "程一诺", "何南枝", "顾北辰", "秦怀瑾", "乔南风", "夏星河", "白清让", "杜若川", "温照夜", "许清欢", "季明澈", "安若素", "方知夏", "陆听白", "云舒", "林见鹿", "陈沐阳", "周鹿鸣", "叶知微", "顾西洲", "宋时安", "韩栖迟", "闻知行", "许映雪"];
const p3Directions: Interviewer["businessDirection"][] = ["招聘", "数据", "技术", "文化", "绩效"];
const managerByDirection: Record<Interviewer["businessDirection"], string> = { 招聘: "王可欣", 数据: "顾云岚", 技术: "秦越", 文化: "叶青舟", 绩效: "宋清梨" };
const roleByDirection: Record<Interviewer["businessDirection"], string> = { 招聘: "招聘流程面试官", 数据: "数据分析面试官", 技术: "技术面试官", 文化: "组织文化面试官", 绩效: "绩效系统面试官" };
const styleByDirection: Record<Interviewer["businessDirection"], string> = {
  招聘: "结构化、业务理解、候选人体验",
  数据: "数据导向、逻辑严谨、指标拆解",
  技术: "技术深挖、架构能力、代码规范",
  文化: "温和深入、价值观、动机判断",
  绩效: "目标拆解、结果导向、系统思维"
};
const skillsByDirection: Record<Interviewer["businessDirection"], string[]> = {
  招聘: ["招聘流程", "产品运营", "AI应用", "候选人体验"],
  数据: ["SQL", "数据分析", "指标体系", "可视化"],
  技术: ["前端", "后端", "React", "TypeScript", "工程能力"],
  文化: ["组织文化", "动机判断", "沟通协作", "员工体验"],
  绩效: ["绩效系统", "目标管理", "组织诊断", "数据分析"]
};

export const interviewerPool: Interviewer[] = [
  ...rows,
  ...p3Names.map((name, index): Omit<Interviewer, "availableSlots" | "scheduledInterviews"> => {
    const businessDirection = p3Directions[index % p3Directions.length];
    return {
      id: `iv${String(index + 16).padStart(3, "0")}`,
      name,
      level: "P3",
      managerName: managerByDirection[businessDirection],
      jobRole: roleByDirection[businessDirection],
      businessDirection,
      personalStyle: styleByDirection[businessDirection],
      skills: skillsByDirection[businessDirection],
      group: `${businessDirection}小组`,
      canEvaluate: index % 7 !== 0
    };
  })
].map((interviewer, index) => ({
  ...interviewer,
  availableSlots: [slots[index % slots.length], slots[(index + 2) % slots.length], slots[(index + 5) % slots.length]],
  scheduledInterviews: seedScheduledInterviews.filter((interview) => interview.interviewerId === interviewer.id)
}));
