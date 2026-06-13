import type { Candidate, Job } from "@/lib/mock";
import type { Interviewer } from "@/data/interviewers";

export function generateInterviewNotifications({
  candidate,
  job,
  interviewer,
  slot,
  roundType,
  questions
}: {
  candidate: Candidate;
  job: Job;
  interviewer: Interviewer;
  slot: string;
  roundType: string;
  questions: string[];
}) {
  const focus = questions.slice(0, 3).map((question) => question.replace(/^\d+\.\s*/, "")).join("；");
  return {
    candidateMessage: `【YOU鹅面试通知】你好，${candidate.name}，你投递的「${job.title}」已安排面试，时间为 ${slot}，面试官为 ${interviewer.name}。请提前查看岗位 JD，并在面试中心确认安排。如需修改时间，可在面试中心提交改面申请。`,
    interviewerMessage: `【YOU鹅面试安排】你好，${interviewer.name}，系统已为你匹配候选人 ${candidate.name}，岗位为「${job.title}」，面试时间为 ${slot}。候选人背景：${candidate.resumeSummary}。建议重点关注：${focus}。`,
    hrLog: `AI 已根据候选人可面时间、面试官可面时间、岗位方向、候选人履历和面试官特长，完成${roundType}一键约面匹配。`
  };
}

export function sendEmailNotification() {
  return { status: "reserved", message: "已预留邮件发送接口，当前使用项目内通知模拟。" };
}

export function sendSmsNotification() {
  return { status: "reserved", message: "已预留短信发送接口，当前使用项目内通知模拟。" };
}

export function sendWechatWorkNotification() {
  return { status: "reserved", message: "已预留企业微信发送接口，当前使用项目内通知模拟。" };
}
