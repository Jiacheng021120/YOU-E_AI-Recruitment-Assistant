import { businessDirectionFromTitle } from "@/lib/mock";
import type { Candidate, Job } from "@/lib/mock";
import type { Interviewer } from "@/data/interviewers";

export type RoundType = "leader-first" | "first" | "final";

export type InterviewMatchResult = {
  interviewerId: string;
  interviewerName: string;
  interviewerLevel: string;
  interviewerRole: string;
  businessDirection: string;
  recommendedSlot: string;
  totalScore: number;
  scoreBreakdown: {
    timeScore: number;
    directionScore: number;
    skillScore: number;
    levelScore: number;
    styleScore: number;
    workloadScore: number;
    leaderRuleScore: number;
  };
  reasons: string[];
  risks: string[];
  questions: string[];
};

type MatchArgs = {
  candidate: Candidate;
  job: Job;
  interviewers: Interviewer[];
  roundType?: RoundType;
};

const slotOrder = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function jobBusinessDirection(job: Job): Interviewer["businessDirection"] {
  return job.businessDirection ?? businessDirectionFromTitle(job.title, job.department);
}

function requiresLeaderFirst(job: Job, candidate: Candidate) {
  return Boolean(job.requiresLeaderFirst || job.leaderName || job.urgency === "高" || candidate.gooseScore >= 85);
}

function sortedSlots(slots: string[]) {
  return [...slots].sort((a, b) => {
    const dayA = slotOrder.findIndex((day) => a.startsWith(day));
    const dayB = slotOrder.findIndex((day) => b.startsWith(day));
    if (dayA !== dayB) return dayA - dayB;
    return a.localeCompare(b, "zh-CN");
  });
}

function textBag(candidate: Candidate) {
  return [
    candidate.appliedRole,
    candidate.resumeSummary,
    candidate.school,
    candidate.major,
    candidate.internships,
    ...candidate.projects,
    ...candidate.skills,
    ...candidate.targetRoles,
    ...(candidate.interviewPreference?.preferredStyle ?? [])
  ].join(" ").toLowerCase();
}

function directionScore(interviewer: Interviewer, job: Job) {
  const direction = jobBusinessDirection(job);
  if (interviewer.businessDirection === direction) return 20;
  const related = new Set(["招聘-数据", "数据-招聘", "招聘-技术", "技术-招聘", "绩效-数据", "数据-绩效"]);
  return related.has(`${direction}-${interviewer.businessDirection}`) ? 12 : 5;
}

function skillScore(candidate: Candidate, interviewer: Interviewer, job: Job) {
  const bag = textBag(candidate);
  const keywords = [...new Set([...interviewer.skills, ...job.requiredSkills])];
  const hits = keywords.filter((keyword) => bag.includes(keyword.toLowerCase()) || candidate.skills.includes(keyword));
  if (hits.length >= 4) return { score: 20, hits };
  if (hits.length >= 2) return { score: 12, hits };
  return { score: 5, hits };
}

function levelScore(interviewer: Interviewer, leaderFirst: boolean, roundType: RoundType) {
  if (leaderFirst || roundType === "leader-first") {
    if (interviewer.level === "P1") return 10;
    if (interviewer.level === "P2") return 5;
    return null;
  }
  if (roundType === "final") {
    if (interviewer.level === "P1") return 10;
    if (interviewer.level === "P2") return 7;
    return null;
  }
  return interviewer.level === "P1" ? 6 : 10;
}

function levelAllowed(interviewer: Interviewer, job: Job, leaderFirst: boolean, roundType: RoundType) {
  if (job.leaderName && interviewer.name !== job.leaderName) return false;
  if ((leaderFirst || roundType === "leader-first") && interviewer.level === "P3") return false;
  if (roundType === "final" && interviewer.level === "P3") return false;
  if (job.preferredInterviewerLevels?.length) return job.preferredInterviewerLevels.includes(interviewer.level);
  return true;
}

function styleScore(candidate: Candidate, interviewer: Interviewer, job: Job) {
  const bag = `${textBag(candidate)} ${job.title} ${job.jd}`;
  const style = interviewer.personalStyle;
  if ((bag.includes("数据") || bag.includes("sql") || bag.includes("指标")) && /数据|逻辑|指标/.test(style)) return 10;
  if ((bag.includes("产品") || bag.includes("运营") || bag.includes("用户")) && /结构化|业务|用户体验/.test(style)) return 10;
  if ((bag.includes("react") || bag.includes("typescript") || bag.includes("前端") || bag.includes("工程")) && /技术|架构|代码/.test(style)) return 10;
  if ((bag.includes("文化") || bag.includes("组织") || bag.includes("沟通")) && /温和|价值观|动机/.test(style)) return 10;
  return 5;
}

function workloadScore(interviewer: Interviewer) {
  const count = interviewer.scheduledInterviews?.length ?? 0;
  if (count <= 1) return 5;
  if (count <= 3) return 3;
  return 1;
}

function leaderRuleScore(interviewer: Interviewer, job: Job, leaderFirst: boolean) {
  if (job.leaderName) return interviewer.name === job.leaderName ? 5 : 0;
  if (leaderFirst && interviewer.level === "P1") return 5;
  if (job.department && interviewer.group?.includes(jobBusinessDirection(job))) return 5;
  if (interviewer.managerName && ["李一鸣", "周嘉禾", "刘思远", "赵安琪", "陈秉文"].includes(interviewer.managerName)) return 5;
  return 2;
}

export function generateInterviewQuestions(candidate: Candidate, job: Job, interviewer: Interviewer) {
  const projectHint = candidate.resumeSummary || candidate.internships;
  return [
    `请结合你的经历，讲一下最能代表你能力的一段项目或实习：${projectHint}`,
    `你如何理解「${job.title}」的核心职责？你会如何拆解 ${job.jd}`,
    `请复盘一次你负责的项目，说明目标、动作、结果和复盘结论。`,
    `你的技能标签包括 ${candidate.skills.join("、")}，请说明其中最熟的一项如何在真实项目中使用。`,
    `你目前对这个岗位的优先级、到岗时间和后续安排是怎样的？`
  ].map((question, index) => `${index + 1}. ${question}`);
}

export function matchInterview({ candidate, job, interviewers, roundType = "first" }: MatchArgs): InterviewMatchResult[] {
  const leaderFirst = requiresLeaderFirst(job, candidate);
  const candidateSlots = new Set(candidate.availableSlots);
  const results = interviewers.flatMap((interviewer) => {
    if (!interviewer.canEvaluate) return [];
    const overlaps = sortedSlots(interviewer.availableSlots.filter((slot) => candidateSlots.has(slot)));
    if (!overlaps.length) return [];
    const level = levelScore(interviewer, leaderFirst, roundType);
    if (level == null) return [];
    if (!levelAllowed(interviewer, job, leaderFirst, roundType)) return [];
    const timeScore = Math.min(30, 27 + Math.min(3, overlaps.length));
    const skill = skillScore(candidate, interviewer, job);
    const scoreBreakdown = {
      timeScore,
      directionScore: directionScore(interviewer, job),
      skillScore: skill.score,
      levelScore: level,
      styleScore: styleScore(candidate, interviewer, job),
      workloadScore: workloadScore(interviewer),
      leaderRuleScore: leaderRuleScore(interviewer, job, leaderFirst)
    };
    const totalScore = Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0);
    const risks = [];
    if (candidate.pigeonScore >= 75) risks.push("候选人鸽值较高，建议优先确认求职意愿、其他机会和到岗时间。");
    if ((interviewer.scheduledInterviews?.length ?? 0) > 3) risks.push("面试官近期安排较满，可能需要备选方案。");
    if (skill.score <= 5) risks.push("技能重合较少，建议 HR 复核是否需要更换方向。");
    return [{
      interviewerId: interviewer.id,
      interviewerName: interviewer.name,
      interviewerLevel: interviewer.level,
      interviewerRole: interviewer.jobRole,
      businessDirection: interviewer.businessDirection,
      recommendedSlot: overlaps[0],
      totalScore,
      scoreBreakdown,
      reasons: [
        `候选人与面试官有 ${overlaps.length} 个共同可面时间，推荐最早时间 ${overlaps[0]}。`,
        `面试官方向为${interviewer.businessDirection}，岗位方向为${jobBusinessDirection(job)}。`,
        skill.hits.length ? `技能命中：${skill.hits.join("、")}。` : "技能命中较少，需要面试中补充验证。",
        `职级 ${interviewer.level} 符合${leaderFirst ? "大领导优先" : roundType === "final" ? "终面" : "一面"}规则。`,
        `个人风格：${interviewer.personalStyle}。`
      ],
      risks,
      questions: generateInterviewQuestions(candidate, job, interviewer)
    }];
  });
  return results.sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
}

export function rescheduleInterview({
  candidate,
  job,
  currentInterviewer,
  interviewers,
  reason
}: {
  interviewId: string;
  requesterType: "candidate" | "interviewer" | "hr";
  reason: string;
  candidate: Candidate;
  job: Job;
  currentInterviewer: Interviewer;
  interviewers: Interviewer[];
}) {
  const overlaps = sortedSlots(currentInterviewer.availableSlots.filter((slot) => candidate.availableSlots.includes(slot)));
  if (overlaps.length > 1) {
    return {
      changedInterviewer: false,
      interviewer: currentInterviewer,
      slot: overlaps[1],
      reason: `改面原因：${reason}。原面试官仍有新的共同可用时间，优先保留原面试官。`
    };
  }
  const [next] = matchInterview({ candidate, job, interviewers: interviewers.filter((item) => item.id !== currentInterviewer.id), roundType: "first" });
  return {
    changedInterviewer: true,
    interviewer: interviewers.find((item) => item.id === next?.interviewerId) ?? currentInterviewer,
    slot: next?.recommendedSlot ?? candidate.availableSlots[0],
    reason: next ? `改面原因：${reason}。原面试官无新的共同时间，已推荐新面试官。` : `改面原因：${reason}。暂无更优面试官，保留原安排待人工确认。`,
    match: next
  };
}
