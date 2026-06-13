"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AppState, Candidate, CandidateProfile, Interviewer, Job, Role, Stage, hasActiveInterviewProcess, initialState, mockAIResponse, modelName, parseResumeMock, personaCols, personaFromScores, personaMatrix, personaRows, personaSpecies, stageLabel, stages } from "@/lib/mock";
import { getPersonaAsset } from "@/lib/personaAssets";
import { interviewerPool } from "@/data/interviewers";
import type { Interviewer as BusinessInterviewer, ScheduledInterview } from "@/data/interviewers";
import type { InterviewMatchResult } from "@/lib/interviewMatchingAgent";
import { matchInterview, rescheduleInterview } from "@/lib/interviewMatchingAgent";
import { generateInterviewNotifications } from "@/lib/interviewNotificationAgent";

const storageKey = "you-e-state-v3-candidate-resume";
const candidateProfileStorageKey = "yougoose_candidate_profile";
const selectedInterviewerStorageKey = "yougoose_selected_interviewer_id";
const businessInterviewersStorageKey = "yougoose_business_interviewers";
const week = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const times = ["09:00-10:00", "10:00-11:00", "14:00-15:00", "15:00-16:00", "16:00-17:00"];
type AppModal = { type: string; candidate?: Candidate; job?: Job; text?: string; matches?: InterviewMatchResult[]; selectedMatchIndex?: number; currentInterviewerId?: string; reason?: string };

export default function Home() {
  const [role, setRole] = useState<Role | null>(null);
  const [active, setActive] = useState("当前流程");
  const [state, setState] = useState<AppState>(initialState);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [modal, setModal] = useState<AppModal | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [businessInterviewers, setBusinessInterviewers] = useState<BusinessInterviewer[]>(interviewerPool);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState(interviewerPool[0]?.id ?? "");
  const [chat, setChat] = useState([{ from: "ai", text: "我是 YOU鹅 AI 助手，可以帮你了解流程、分析简历、推荐岗位方向并生成面试准备建议。" }]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setState(normalizeState(JSON.parse(saved) as AppState));
    const savedProfile = localStorage.getItem(candidateProfileStorageKey);
    if (savedProfile) setCandidateProfile(JSON.parse(savedProfile) as CandidateProfile);
    const savedInterviewerId = localStorage.getItem(selectedInterviewerStorageKey);
    if (savedInterviewerId) setSelectedInterviewerId(savedInterviewerId);
    const savedInterviewers = localStorage.getItem(businessInterviewersStorageKey);
    if (savedInterviewers) setBusinessInterviewers(normalizeBusinessInterviewers(JSON.parse(savedInterviewers) as BusinessInterviewer[]));
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (candidateProfile) localStorage.setItem(candidateProfileStorageKey, JSON.stringify(candidateProfile));
  }, [candidateProfile]);

  useEffect(() => {
    localStorage.setItem(selectedInterviewerStorageKey, selectedInterviewerId);
  }, [selectedInterviewerId]);

  useEffect(() => {
    localStorage.setItem(businessInterviewersStorageKey, JSON.stringify(businessInterviewers));
  }, [businessInterviewers]);

  useEffect(() => {
    const selected = businessInterviewers.find((item) => item.id === selectedInterviewerId);
    if (role === "business" && active === "评估" && selected && selected.level !== "P1") setActive("面试");
  }, [active, businessInterviewers, role, selectedInterviewerId]);

  const menus = role === "candidate"
    ? ["解析简历", "当前流程", "面试中心", "AI 助手"]
    : role === "hr"
      ? ["人才库", "岗位候选人", "评估中", "面试中", "面试通过", "已入职", "AI 数据监控"]
      : ["评估", "面试", "动态数据"];

  useEffect(() => {
    if (role) setActive(menus[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function updateCandidate(id: string, patch: Partial<Candidate>, log?: string) {
    setState((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) => candidate.id === id ? {
        ...candidate,
        ...patch,
        personaType: personaFromScores(patch.gooseScore ?? candidate.gooseScore, patch.pigeonScore ?? candidate.pigeonScore),
        scoreChangeReasons: log ? [log, ...candidate.scoreChangeReasons].slice(0, 6) : candidate.scoreChangeReasons,
        logs: log ? [log, ...candidate.logs] : candidate.logs
      } : candidate),
      notifications: log ? [log, ...current.notifications].slice(0, 12) : current.notifications
    }));
  }

  function addNotice(text: string) {
    setState((current) => ({ ...current, notifications: [text, ...current.notifications].slice(0, 12) }));
  }

  function promoteToEvaluation(candidate: Candidate) {
    updateCandidate(candidate.id, {
      currentStage: "evaluating",
      evaluationStatus: "待业务反馈",
      pigeonScore: Math.max(8, candidate.pigeonScore - 4)
    }, `HR 推进 ${candidate.name} 进入评估，AI 已生成业务摘要。`);
  }

  function businessPass(candidate: Candidate) {
    updateCandidate(candidate.id, {
      evaluationStatus: "业务通过",
      gooseScore: Math.min(100, candidate.gooseScore + 5),
      pigeonScore: Math.min(100, candidate.pigeonScore + 3)
    }, `业务方通过 ${candidate.name}，HR 可一键约面。`);
  }

  function businessReject(candidate: Candidate) {
    updateCandidate(candidate.id, {
      evaluationStatus: "业务不通过",
      gooseScore: Math.max(0, candidate.gooseScore - 9)
    }, `业务方不通过 ${candidate.name}：经历或方向匹配不足。`);
  }

  function arrangeInterview(candidate: Candidate) {
    const job = state.jobs.find((item) => item.title === candidate.appliedRole);
    if (!job) {
      setModal({ type: "info", text: "没有找到候选人对应岗位，无法约面。" });
      return;
    }
    const matches = matchInterview({
      candidate,
      job,
      interviewers: businessInterviewers,
      roundType: job.urgency === "高" || candidate.gooseScore >= 85 ? "leader-first" : "first"
    });
    if (!matches.length) {
      setModal({ type: "info", text: "未找到与候选人可面时间重合、且满足职级/方向规则的面试官。请先补充候选人或面试官可面时间。" });
      return;
    }
    setModal({
      type: "match",
      candidate,
      job,
      matches,
      selectedMatchIndex: 0,
      text: "一键约面 Agent 已完成真实规则匹配。"
    });
  }

  function confirmReschedule(candidate: Candidate) {
    const job = state.jobs.find((item) => item.title === candidate.appliedRole) ?? state.jobs[0];
    const currentInterviewer = interviewerPool.find((item) => item.name === candidate.interviewHistory.find((item) => item.startsWith("面试官："))?.replace("面试官：", "")) ?? interviewerPool[0];
    const result = rescheduleInterview({
      interviewId: `${candidate.id}-interview`,
      requesterType: "candidate",
      reason: modal?.reason ?? "时间冲突",
      candidate,
      job,
      currentInterviewer,
      interviewers: businessInterviewers
    });
    result.interviewer.scheduledInterviews = [
      ...(result.interviewer.scheduledInterviews ?? []),
      {
        id: `${candidate.id}-reschedule-${Date.now()}`,
        candidateId: candidate.id,
        candidateName: candidate.name,
        jobId: job.id,
        jobTitle: job.title,
        interviewerId: result.interviewer.id,
        interviewerName: result.interviewer.name,
        interviewTime: result.slot,
        round: "一面",
        status: "已改面"
      }
    ];
    setBusinessInterviewers((items) => items.map((item) => item.id === result.interviewer.id ? result.interviewer : item));
    setState((current) => ({
      ...current,
      scheduledInterviews: [
        {
          id: `${candidate.id}-reschedule-${Date.now()}`,
          candidateId: candidate.id,
          candidateName: candidate.name,
          jobId: job.id,
          jobTitle: job.title,
          interviewerId: result.interviewer.id,
          interviewerName: result.interviewer.name,
          interviewTime: result.slot,
          round: "一面",
          status: "已改面"
        },
        ...current.scheduledInterviews.filter((item) => item.candidateId !== candidate.id || item.status === "已完成")
      ]
    }));
    updateCandidate(candidate.id, {
      interviewStatus: "改面已确认",
      pigeonScore: Math.max(0, candidate.pigeonScore - 4),
      rescheduleCount: candidate.rescheduleCount + 1,
      interviewHistory: [
        `改面后时间：${result.slot}`,
        `面试官：${result.interviewer.name}`,
        result.reason,
        ...candidate.interviewHistory
      ]
    }, `一键改面 Agent 已确认 ${candidate.name} 改面，新安排为 ${result.slot}，面试官：${result.interviewer.name}。项目内通知已同步候选人、HR 和业务方。`);
    setModal(null);
  }

  function confirmInterview(candidate: Candidate) {
    const match = modal?.matches?.[modal.selectedMatchIndex ?? 0];
    const job = modal?.job ?? state.jobs.find((item) => item.title === candidate.appliedRole) ?? state.jobs[0];
    const interviewer = businessInterviewers.find((person) => person.id === match?.interviewerId) ?? businessInterviewers[0];
    const slot = match?.recommendedSlot ?? candidate.availableSlots[0] ?? "周三 15:00-16:00";
    const scheduledInterview: ScheduledInterview = {
      id: `${candidate.id}-${Date.now()}`,
      candidateId: candidate.id,
      candidateName: candidate.name,
      jobId: job.id,
      jobTitle: job.title,
      interviewerId: interviewer.id,
      interviewerName: interviewer.name,
      interviewTime: slot,
      round: "一面",
      status: "待面试"
    };
    interviewer.scheduledInterviews = [
      ...(interviewer.scheduledInterviews ?? []),
      scheduledInterview
    ];
    setBusinessInterviewers((items) => items.map((item) => item.id === interviewer.id ? interviewer : item));
    setState((current) => ({
      ...current,
      scheduledInterviews: [scheduledInterview, ...current.scheduledInterviews.filter((item) => item.id !== scheduledInterview.id)]
    }));
    const notifications = generateInterviewNotifications({
      candidate,
      job,
      interviewer,
      slot,
      roundType: "一面",
      questions: match?.questions ?? []
    });
    updateCandidate(candidate.id, {
      currentStage: "interviewing",
      evaluationStatus: "业务通过",
      interviewStatus: "待面试",
      pigeonScore: Math.max(0, candidate.pigeonScore - 8),
      activeApplicationStage: "interview",
      interviewHistory: [
        `面试时间：${slot}`,
        `面试官：${interviewer.name}`,
        `面试问题建议：${(match?.questions ?? []).join("；")}`,
        notifications.candidateMessage,
        notifications.interviewerMessage,
        ...candidate.interviewHistory
      ]
    }, `${notifications.hrLog} ${notifications.candidateMessage} ${notifications.interviewerMessage}`);
    setModal(null);
  }

  function submitFeedback(candidate: Candidate) {
    updateCandidate(candidate.id, {
      currentStage: "passed",
      interviewStatus: "通过",
      offerStatus: "待 offer",
      gooseScore: Math.min(100, candidate.gooseScore + 8),
      pigeonScore: Math.max(0, candidate.pigeonScore - 3),
      interviewHistory: ["面试官提交 AI 整理面评：建议通过", ...candidate.interviewHistory]
    }, `面试官提交 ${candidate.name} 面评，候选人进入面试通过。`);
  }

  function onboard(candidate: Candidate) {
    updateCandidate(candidate.id, {
      currentStage: "onboarded",
      offerStatus: "已入职",
      pigeonScore: Math.max(0, candidate.pigeonScore - 12)
    }, `${candidate.name} 已确认入职，AI 生成招聘复盘。`);
  }

  function markLost(candidate: Candidate) {
    updateCandidate(candidate.id, {
      currentStage: "lost",
      offerStatus: "已鸽",
      pigeonScore: 100
    }, `${candidate.name} 已流失，HC 风险预案 Agent 建议自动补位。`);
  }

  function aiPhone(candidate: Candidate) {
    setModal({ type: "phone", candidate, text: "AI 正在电话联系候选人..." });
    window.setTimeout(() => {
      const outcomes = ["有意向：自动进入评估流程。", "暂时观望：加入待跟进。", "无意向：保留人才库。"];
      const result = outcomes[Math.floor(Math.random() * outcomes.length)];
      setModal({ type: "phone", candidate, text: result });
      if (result.startsWith("有意向")) promoteToEvaluation(candidate);
      else addNotice(`AI 电话寻访 ${candidate.name}：${result}`);
    }, 3000);
  }

  function batchPromote() {
    const picked = state.candidates
      .filter((candidate) => candidate.currentStage === "job")
      .filter((candidate) => candidate.gooseScore >= 75 || (candidate.gooseScore >= 65 && candidate.pigeonScore >= 70))
      .slice(0, 4);
    picked.forEach(promoteToEvaluation);
    setModal({ type: "info", text: `AI 选择了 ${picked.map((candidate) => candidate.name).join("、")}。理由：鹅值高，或鹅值高且鸽值高需要抢救，适合先进入业务评估。` });
  }

  function handleResumeUpload(file: File) {
    const uploadedAt = new Date().toLocaleString("zh-CN", { hour12: false });
    setResumeFile(file);
    setCandidateProfile(null);
    localStorage.removeItem(candidateProfileStorageKey);
    updateCandidate("c1", {
      resumeFileName: file.name,
      resumeUploadedAt: uploadedAt,
      resumeAnalysisStatus: "not_uploaded"
    }, `候选人上传简历：${file.name}，等待开始解析。`);
  }

  function applyProfileToCandidate(profile: CandidateProfile, fileName?: string) {
    const primaryJob = profile.recommendedJobs[0];
    updateCandidate("c1", {
      name: profile.name,
      school: profile.school,
      major: profile.major,
      city: profile.city,
      education: profile.education,
      applicationType: "日常实习",
      graduationYear: profile.graduationYear,
      expectedGraduationDate: `${profile.graduationYear}-06`,
      internships: profile.internships.join("、"),
      projects: profile.projects,
      skills: profile.skills,
      targetRoles: profile.targetRoles,
      targetDirection: primaryJob?.department.includes("数据") ? "数据" : primaryJob?.department.includes("研发") ? "技术" : "招聘",
      appliedRole: primaryJob?.title ?? profile.targetRoles[0] ?? "产品运营实习生",
      resumeSummary: profile.resumeSummary,
      resumeFileName: fileName,
      resumeAnalysisStatus: "completed",
      resumeAnalysis: {
        summary: profile.resumeSummary,
        strengths: profile.strengths,
        recommendedRoles: profile.recommendedJobs.map((job) => ({
          roleId: job.id,
          roleTitle: job.title,
          matchLevel: job.matchLevel === "高" ? "高" : job.matchLevel,
          reason: job.reason
        })),
        optimizationTips: profile.optimizationTips,
        interviewTips: profile.interviewTips
      },
      activeJobId: primaryJob?.id,
      activeApplicationStage: "none",
      currentStage: "talent",
      interviewStatus: "未安排",
      interviewHistory: []
    }, `候选人完成简历解析：${profile.name}，候选人端资料已更新。`);
  }

  async function startResumeParse() {
    const candidate = state.candidates.find((item) => item.id === "c1") ?? state.candidates[0];
    const fileName = candidate.resumeFileName ?? "候选人简历.pdf";
    if (!resumeFile) {
      updateCandidate("c1", { resumeAnalysisStatus: "failed" }, "真实解析失败：刷新页面后浏览器不会保留文件对象，请重新选择简历文件。");
      setModal({ type: "info", text: "请重新选择简历文件后再点击“开始解析”。浏览器出于安全限制，刷新后不会保留本地文件内容。" });
      return;
    }
    updateCandidate("c1", { resumeAnalysisStatus: "analyzing" }, `YOU鹅 开始解析 ${fileName}。`);
    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.profile) {
        throw new Error(data.error || "真实解析失败，请确认文件是可复制文字的 PDF/DOCX。");
      }
      const profile = data.profile as CandidateProfile;
      setCandidateProfile(profile);
      applyProfileToCandidate(profile, fileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : "真实解析失败，请重新上传。";
      updateCandidate("c1", { resumeAnalysisStatus: "failed" }, `真实解析失败：${message}`);
      setModal({ type: "info", text: `真实解析失败：${message}\n\n建议：上传可复制文字的 PDF 或 DOCX；扫描版 PDF/图片简历暂时无法本地 OCR。` });
    }
  }

  function applyCandidateProfile() {
    const candidate = state.candidates.find((item) => item.id === "c1") ?? state.candidates[0];
    if (candidateProfile) applyProfileToCandidate(candidateProfile, candidate.resumeFileName);
  }

  function useDemoResumeProfile() {
    const demoFiles = ["产品运营示例简历.pdf", "data-analysis-demo-resume.pdf", "frontend-react-demo-resume.pdf"];
    const fileName = demoFiles[Math.floor(Math.random() * demoFiles.length)];
    const profile = parseResumeMock(fileName);
    const uploadedAt = new Date().toLocaleString("zh-CN", { hour12: false });
    setResumeFile(null);
    setCandidateProfile(profile);
    updateCandidate("c1", {
      resumeFileName: `示例简历测试 - ${fileName}`,
      resumeUploadedAt: uploadedAt,
      resumeAnalysisStatus: "completed"
    }, `候选人使用示例简历测试：${fileName}。`);
    applyProfileToCandidate(profile, `示例简历测试 - ${fileName}`);
  }

  function chooseActiveJob(jobId: string) {
    const profileJob = candidateProfile?.recommendedJobs.find((job) => job.id === jobId);
    updateCandidate("c1", {
      activeJobId: jobId,
      appliedRole: profileJob?.title ?? state.jobs.find((job) => job.id === jobId)?.title ?? "产品运营实习生",
      activeApplicationStage: "applied",
      currentStage: "job"
    }, `候选人选择 ${profileJob?.title ?? "推荐岗位"} 作为当前主推进岗位。`);
  }

  async function sendChat(text: string) {
    const candidateUser = state.candidates.find((candidate) => candidate.id === "c1") ?? state.candidates[0];
    const resumeAnalysis = candidateUser.resumeAnalysis;
    const needsResume = role === "candidate" && ["简历", "岗位", "准备", "亮点", "优化"].some((word) => text.includes(word));
    if (needsResume && !candidateProfile) {
      setChat((items) => [...items, { from: "user", text }, { from: "ai", text: "请先在左侧「解析简历」中上传简历，我会根据你的履历帮你分析岗位匹配和优化建议。" }]);
      return;
    }

    const lowerRisk = state.candidates.filter((candidate) => candidate.pigeonScore < 45 && candidate.gooseScore > 70).slice(0, 3);
    const candidateResumeAnswer = candidateProfile && role === "candidate"
      ? text.includes("亮点")
        ? `根据你的${candidateProfile.internships.join("、")}经历，你的简历亮点主要是：${candidateProfile.strengths.join("；")}。技能标签包括 ${candidateProfile.skills.join("、")}。`
        : text.includes("优化")
          ? `可以这样优化：${candidateProfile.optimizationTips.join("；")}。尤其建议把 ${candidateProfile.projects[0]} 的结果数据写得更具体。`
          : text.includes("准备")
            ? `建议根据你的项目经历准备面试：${candidateProfile.projects.join("、")}。重点准备：${candidateProfile.interviewTips.join("；")}。`
            : text.includes("优先")
              ? `建议优先投 ${candidateProfile.recommendedJobs[0]?.title ?? candidateProfile.targetRoles[0]}。原因是${candidateProfile.recommendedJobs[0]?.reason ?? "与你当前经历最匹配"}`
              : `你的简历目前更适合：${candidateProfile.recommendedJobs.map((item) => `${item.title}：匹配度${item.matchLevel}`).join("；")}。你的技能标签包括 ${candidateProfile.skills.join("、")}。`
      : undefined;
    const fallbackAnswer = candidateResumeAnswer ?? (text.includes("岗位")
      ? `推荐优先看 ${lowerRisk.map((candidate) => candidate.appliedRole).join("、")}。AI 判断依据是技能、经历与岗位要求的匹配程度。`
      : text.includes("准备")
        ? "建议按项目背景、岗位理解、数据复盘、协作冲突、风险确认五类准备，每类准备一个 STAR 案例。"
        : text.includes("简历")
          ? "可以把经历改写成动作 + 指标 + 结果，例如：独立搭建活动复盘看板，使转化分析时间减少 40%。"
          : "你的流程正在推进中。你可以查看当前阶段、下一步安排，也可以上传简历获取岗位方向和面试准备建议。");
    setChat((items) => [...items, { from: "user", text }, { from: "ai", text: "YOU鹅 正在调用 DeepSeek V4..." }]);

    try {
      const response = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          context: role === "candidate" && candidateProfile
            ? `候选人端简历资料：${candidateProfile.resumeSummary}。学校：${candidateProfile.school}，专业：${candidateProfile.major}，经历：${candidateProfile.internships.join("、")}，项目：${candidateProfile.projects.join("、")}，技能：${candidateProfile.skills.join("、")}，推荐岗位：${candidateProfile.recommendedJobs.map((item) => `${item.title}(${item.matchLevel})`).join("、")}。请不要提及鹅值、鸽值、鸽鹅机制、内部画像、风险或百分位。`
            : `候选人数量 ${state.candidates.length}。`
        })
      });
      const data = await response.json();
      const answer = typeof data.text === "string" ? data.text : fallbackAnswer;
      setChat((items) => [...items.slice(0, -1), { from: "ai", text: answer }]);
    } catch {
      setChat((items) => [...items.slice(0, -1), { from: "ai", text: fallbackAnswer }]);
    }
  }

  if (!role) return <RoleSelect onSelect={setRole} />;
  const selectedBusinessInterviewer = businessInterviewers.find((item) => item.id === selectedInterviewerId) ?? businessInterviewers[0];
  const disabledMenus = role === "business" && selectedBusinessInterviewer?.level !== "P1" ? ["评估"] : [];

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800">
      <div className="flex min-h-screen">
        <Sidebar
          role={role}
          active={active}
          menus={menus}
          disabledMenus={disabledMenus}
          onDisabledClick={(menu) => {
            if (menu === "评估") setModal({ type: "info", text: "仅P1职级具备权限" });
          }}
          onChange={setActive}
          onHome={() => setRole(null)}
        />
        <main className="flex-1 overflow-hidden p-5 lg:p-8">
          <Header role={role} active={active} notifications={state.notifications} />
          {role === "candidate" && (
            <CandidateWorkspace
              active={active}
              state={state}
              candidateProfile={candidateProfile}
              chat={chat}
              sendChat={sendChat}
              onResumeUpload={handleResumeUpload}
              onStartResumeParse={startResumeParse}
              onApplyCandidateProfile={applyCandidateProfile}
              onUseDemoProfile={useDemoResumeProfile}
              onChooseActiveJob={chooseActiveJob}
              onGoParse={() => setActive("解析简历")}
              updateCandidate={updateCandidate}
              setModal={setModal}
              setSelectedCandidate={setSelectedCandidate}
            />
          )}
          {role === "hr" && (
            <HrWorkspace
              active={active}
              state={state}
              promoteToEvaluation={promoteToEvaluation}
              arrangeInterview={arrangeInterview}
              batchPromote={batchPromote}
              aiPhone={aiPhone}
              onboard={onboard}
              markLost={markLost}
              setSelectedCandidate={setSelectedCandidate}
              setModal={setModal}
            />
          )}
          {role === "business" && (
            <BusinessWorkspace
              active={active}
              state={state}
              selectedInterviewerId={selectedInterviewerId}
              setSelectedInterviewerId={setSelectedInterviewerId}
              interviewers={businessInterviewers}
              setInterviewers={setBusinessInterviewers}
              businessPass={businessPass}
              businessReject={businessReject}
              submitFeedback={submitFeedback}
              updateCandidate={updateCandidate}
              setSelectedCandidate={setSelectedCandidate}
              setModal={setModal}
            />
          )}
        </main>
      </div>
      {selectedCandidate && <CandidateDetail role={role} candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />}
      {modal && (
        <GameModal
          modal={modal}
          onClose={() => setModal(null)}
          onSelectMatch={(index) => setModal((current) => current ? { ...current, selectedMatchIndex: index } : current)}
          onSelectReason={(reason) => setModal((current) => current ? { ...current, reason } : current)}
          onConfirm={() => modal.candidate ? (modal.type === "reschedule" ? confirmReschedule(modal.candidate) : confirmInterview(modal.candidate)) : setModal(null)}
        />
      )}
    </div>
  );
}

function RoleSelect({ onSelect }: { onSelect: (role: Role) => void }) {
  const roles = [
    { id: "candidate" as Role, title: "候选人", body: "查看投递进度、上传简历、管理面试与获取 AI 准备建议", icon: "候" },
    { id: "hr" as Role, title: "HR", body: "管理人才库、评估推进、一键约面改面与招聘数据监控", icon: "HR" },
    { id: "business" as Role, title: "业务方", body: "评估候选人、管理面试、提交面评并查看团队动态数据", icon: "业" }
  ];
  return (
    <main className="min-h-screen bg-[#F5F7FA] text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button onClick={() => onSelect("candidate")} className="text-2xl font-black text-blue-600">YOU鹅</button>
          <nav className="flex items-center gap-2 text-sm font-bold text-slate-600">
            {roles.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className="rounded-lg px-3 py-2 hover:bg-blue-50 hover:text-blue-600">{item.title}入口</button>)}
          </nav>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">AI-HR 招聘流程工作台</div>
          <h1 className="flex flex-wrap gap-x-4 gap-y-2 text-4xl font-black leading-tight text-slate-900 md:text-5xl xl:text-6xl">
            <span className="whitespace-nowrap">「YOU鹅」</span>
            <span className="whitespace-nowrap">AI 全流程招聘助手</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-slate-600">用 AI 降低招聘信息差，提升评估、约面与流程推进效率。覆盖候选人、HR、业务方三端协作，适合真实招聘管理场景演示。</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-5 md:grid-cols-3">
          {roles.map((item) => (
            <button key={item.id} onClick={() => onSelect(item.id)} className="quest-card group p-6 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_12px_30px_rgba(22,119,255,.12)]">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-lg font-black text-blue-600">
                {item.icon}
              </div>
              <h2 className="text-2xl font-black text-slate-900">{item.title}</h2>
              <p className="mt-3 min-h-14 text-sm font-semibold leading-6 text-slate-500">{item.body}</p>
              <div className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white">进入工作台</div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function Sidebar({ role, active, menus, disabledMenus = [], onDisabledClick, onChange, onHome }: { role: Role; active: string; menus: string[]; disabledMenus?: string[]; onDisabledClick?: (menu: string) => void; onChange: (menu: string) => void; onHome: () => void }) {
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <button onClick={onHome} className="mb-7 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left">
        <div className="text-2xl font-black text-blue-600">YOU鹅</div>
        <div className="text-xs font-bold text-slate-500">AI 全流程招聘助手</div>
      </button>
      <nav className="space-y-2">
        {menus.map((menu) => {
          const disabled = disabledMenus.includes(menu);
          return (
          <button key={menu} onClick={() => disabled ? onDisabledClick?.(menu) : onChange(menu)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-300 hover:bg-slate-100" : active === menu ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}>
            <span className={`h-2 w-2 rounded-full ${active === menu ? "bg-white" : "bg-slate-300"}`} />
            <span>{menu}</span>
          </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-bold text-slate-500">当前身份</div>
        <div className="mt-1 text-lg font-black text-slate-900">{role === "candidate" ? "候选人" : role === "hr" ? "HR" : "业务方"}</div>
      </div>
    </aside>
  );
}

function Header({ role, active, notifications }: { role: Role; active: string; notifications: string[] }) {
  const visibleNotifications = role === "candidate"
    ? ["你的流程正在推进中，下一步安排会在当前流程页同步。", "上传简历后，YOU鹅 会帮你整理岗位方向和准备建议。", "面试前可以在 AI 助手中生成模拟问答和准备清单。"]
    : notifications;
  return (
    <header className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:grid-cols-[1fr_420px]">
      <div>
        <div className="text-sm font-black text-blue-600">{role === "candidate" ? "候选人个人中心" : role === "hr" ? "HR 招聘管理后台" : "业务方评估工作台"}</div>
        <h1 className="mt-1 text-3xl font-black text-slate-900">{active}</h1>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center justify-between text-sm font-black text-slate-900"><span>通知中心</span><span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">{role === "candidate" ? "个人提醒" : "系统提醒"}</span></div>
        <div className="space-y-1 text-xs font-semibold text-slate-500">
          {visibleNotifications.slice(0, 3).map((notice) => <p key={notice}>• {notice}</p>)}
        </div>
      </div>
    </header>
  );
}

function CandidateWorkspace(props: {
  active: string;
  state: AppState;
  candidateProfile: CandidateProfile | null;
  chat: { from: string; text: string }[];
  sendChat: (text: string) => void | Promise<void>;
  onResumeUpload: (file: File) => void;
  onStartResumeParse: () => void;
  onApplyCandidateProfile: () => void;
  onUseDemoProfile: () => void;
  onChooseActiveJob: (jobId: string) => void;
  onGoParse: () => void;
  updateCandidate: (id: string, patch: Partial<Candidate>, log?: string) => void;
  setModal: (modal: AppModal | null) => void;
  setSelectedCandidate: (candidate: Candidate) => void;
}) {
  const me = props.state.candidates[0];
  const activeCandidate = props.state.candidates.find((candidate) => candidate.id === "c1") ?? me;
  const activeProfileJob = props.candidateProfile?.recommendedJobs.find((job) => job.id === activeCandidate.activeJobId);
  const activeJob = props.state.jobs.find((job) => job.id === activeCandidate.activeJobId) ?? props.state.jobs.find((job) => job.title === activeCandidate.appliedRole);
  const hasActive = hasActiveInterviewProcess(activeCandidate);
  const recommendedJobs = props.candidateProfile?.recommendedJobs ?? [];

  if (props.active === "解析简历") {
    return (
      <ResumeParserPage
        candidate={activeCandidate}
        profile={props.candidateProfile}
        onResumeUpload={props.onResumeUpload}
        onStartResumeParse={props.onStartResumeParse}
        onApplyCandidateProfile={props.onApplyCandidateProfile}
        onUseDemoProfile={props.onUseDemoProfile}
      />
    );
  }

  if (props.active === "面试中心") {
    if (!props.candidateProfile) {
      return (
        <div className="quest-card p-8 text-center">
          <h2 className="text-2xl font-black text-slate-900">请先上传并解析简历</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">系统会根据你的履历生成面试准备建议，并同步到面试中心。</p>
        </div>
      );
    }
    const candidateInterviews = props.state.scheduledInterviews.filter((interview) => interview.candidateId === activeCandidate.id && !["已取消", "已完成"].includes(interview.status));
    const currentInterview = candidateInterviews[0];
    const shouldShowInterview = Boolean(currentInterview) || activeCandidate.activeApplicationStage === "interview" || activeCandidate.currentStage === "interviewing";
    const mockQuestions = buildMockInterviewQuestions(props.candidateProfile);
    return (
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {shouldShowInterview ? (
            <div className="quest-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{activeProfileJob?.title ?? activeJob?.title ?? activeCandidate.appliedRole}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {currentInterview?.round ?? "一面"}｜{currentInterview?.interviewTime ?? activeCandidate.availableSlots[0]}｜面试官：{currentInterview?.interviewerName ?? "待确认"}｜状态：{currentInterview?.status ?? activeCandidate.interviewStatus}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">候选人背景摘要：{props.candidateProfile.resumeSummary}</p>
                  <p className="mt-2 text-sm text-slate-500">岗位 JD：{activeJob?.jd ?? "面试前请重点准备项目复盘、岗位理解和沟通协作案例。"}</p>
                </div>
                <button className="task-button" onClick={() => props.setSelectedCandidate(activeCandidate)}>查看详情</button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <button className="ghost-button" onClick={() => props.setModal({ type: "reschedule", candidate: activeCandidate, text: `YOU鹅 已接收改面申请，正在协调新的可面试时间。
推荐新时间：${activeCandidate.availableSlots[1] ?? "周三 15:00-16:00"}
改面原因：时间冲突 / 临时有事 / 想换到更早时间 / 想换到更晚时间 / 其他
确认后会同步给相关安排人员。` })}>申请修改面试时间</button>
                <button className="danger-button" onClick={() => props.updateCandidate(activeCandidate.id, { interviewStatus: "候选人申请取消，等待确认", activeApplicationStage: "cancelled" }, `${activeCandidate.name} 申请取消面试。`)}>申请取消面试</button>
                <button className="task-button" onClick={() => props.setModal({ type: "mockInterview", candidate: activeCandidate, text: `AI 模拟面试：\n${mockQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")}\n\n模拟反馈：表达较清晰，建议结合 ${props.candidateProfile?.projects[0] ?? "核心项目"} 补充更多量化结果。` })}>AI 模拟面试</button>
              </div>
            </div>
          ) : (
            <div className="quest-card p-8 text-center">
              <h2 className="text-2xl font-black">当前暂无已确认面试</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">你可以先上传简历，YOU鹅 会帮你分析更适合的岗位方向，并生成面试准备建议。</p>
            </div>
          )}
        </div>
        <InterviewCalendar candidate={me} updateCandidate={props.updateCandidate} />
      </section>
    );
  }
  if (props.active === "AI 助手") {
    return (
      <section className="space-y-5">
        <AIChatPanel chat={props.chat} sendChat={props.sendChat} candidate={activeCandidate} profile={props.candidateProfile} />
      </section>
    );
  }
  if (!props.candidateProfile) {
    return (
      <div className="quest-card p-8 text-center">
        <h2 className="text-2xl font-black text-slate-900">你还没有上传简历</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">请先完成简历解析，AI 将根据你的履历推荐适合岗位。</p>
        <button className="task-button mt-5" onClick={props.onGoParse}>去解析简历</button>
      </div>
    );
  }
  return (
    <section className="space-y-5">
      <div className="quest-card p-5">
        <div className="text-sm font-black text-blue-600">我的投递进度</div>
        <h2 className="mt-1 text-2xl font-black text-slate-900">{props.candidateProfile.name}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">{props.candidateProfile.school}｜{props.candidateProfile.major}｜{props.candidateProfile.education}｜毕业年份：{props.candidateProfile.graduationYear}｜目标方向：{props.candidateProfile.targetRoles.join("、")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge border-blue-200 bg-blue-50 text-blue-700">{activeCandidate.applicationType}</span>
          <span className="badge border-slate-200 bg-slate-50 text-slate-600">{activeCandidate.graduationYear} 届</span>
        </div>
      </div>
      <div className="quest-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-black text-blue-600">当前主推进岗位</div>
            <h3 className="mt-1 text-2xl font-black text-slate-900">{activeProfileJob?.title ?? activeJob?.title ?? activeCandidate.appliedRole}</h3>
            <p className="mt-2 text-sm text-slate-500">当前阶段：{candidateFriendlyStage(activeCandidate.activeApplicationStage ?? "none")}</p>
          </div>
          <span className="badge border-blue-200 bg-blue-50 text-blue-700">{hasActive ? "你的流程正在推进中" : "可选择主推进岗位"}</span>
        </div>
        <ProcessTimeline stage={activeCandidate.currentStage} />
        <p className="mt-4 text-sm font-bold text-blue-700">下一步：{hasActive ? candidateNextStep(activeCandidate) : "你可以从下方推荐岗位中确认一个主推进方向，正式进入投递流程。"}</p>
        <p className="mt-2 text-sm text-slate-500">AI 已为你整理面试准备建议。建议提前准备：{props.candidateProfile.interviewTips.slice(0, 2).join("、")}。</p>
      </div>
      <div className="quest-card p-5">
        <h3 className="text-xl font-black text-slate-900">AI 推荐岗位</h3>
        <p className="mt-2 text-sm text-slate-500">你可以浏览多个方向，但同一时间只能有一个主推进岗位进入正式招聘流程。</p>
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {recommendedJobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-black text-slate-900">{job.title}</h4>
                  <p className="mt-1 text-sm font-bold text-blue-600">{job.department}｜匹配度{job.matchLevel}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{activeCandidate.applicationType}｜{activeCandidate.graduationYear} 届</p>
                  <p className="mt-2 text-sm text-slate-500">{job.reason}</p>
                </div>
                {activeCandidate.activeJobId === job.id ? (
                  hasActive ? <span className="badge border-blue-200 bg-blue-50 text-blue-700">主推进</span> : <button className="task-button" onClick={() => props.onChooseActiveJob(job.id)}>确认推进</button>
                ) : hasActive ? (
                  <span className="badge border-slate-200 bg-slate-50 text-slate-500">暂不可推进</span>
                ) : (
                  <button className="ghost-button" onClick={() => props.onChooseActiveJob(job.id)}>设为主推进</button>
                )}
              </div>
              {hasActive && activeCandidate.activeJobId !== job.id && (
                <p className="mt-3 text-xs font-bold text-slate-400">当前已有进行中的招聘流程，等当前流程结束后可继续申请。</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ResumeParserPage({
  candidate,
  profile,
  onResumeUpload,
  onStartResumeParse,
  onApplyCandidateProfile,
  onUseDemoProfile
}: {
  candidate: Candidate;
  profile: CandidateProfile | null;
  onResumeUpload: (file: File) => void;
  onStartResumeParse: () => void;
  onApplyCandidateProfile: () => void;
  onUseDemoProfile: () => void;
}) {
  const statusText: Record<Candidate["resumeAnalysisStatus"], string> = {
    not_uploaded: candidate.resumeFileName ? "未解析" : "未上传",
    analyzing: "AI 解析中",
    completed: profile ? "解析完成" : "未解析",
    failed: "解析失败，请重新上传"
  };
  const canStart = Boolean(candidate.resumeFileName) && candidate.resumeAnalysisStatus !== "analyzing";
  return (
    <section className="space-y-5">
      <div className="quest-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900">解析简历</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              上传可复制文字的 PDF 或 DOCX 简历后，AI 将自动识别你的教育背景、实习经历、项目经历、技能标签，并为你生成岗位匹配建议。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="ghost-button cursor-pointer">
              {candidate.resumeFileName ? "重新上传" : "上传简历"}
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onResumeUpload(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button className="task-button" disabled={!canStart} onClick={onStartResumeParse}>开始解析</button>
            <button className="ghost-button" onClick={onUseDemoProfile}>使用示例简历测试</button>
            <button className="ghost-button" disabled={!profile} onClick={onApplyCandidateProfile}>应用到我的资料</button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoPanel title="文件名" text={candidate.resumeFileName ?? "暂未上传"} />
          <InfoPanel title="上传时间" text={candidate.resumeUploadedAt ?? "未上传"} />
          <InfoPanel title="解析状态" text={statusText[candidate.resumeAnalysisStatus ?? "not_uploaded"]} />
        </div>
        {candidate.resumeAnalysisStatus === "analyzing" && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">AI 正在分析简历...</div>}
      </div>

      {profile ? (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="quest-card p-5">
              <h3 className="text-xl font-black text-slate-900">基础信息识别</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["姓名", profile.name],
                  ["学校", profile.school],
                  ["专业", profile.major],
                  ["学历", profile.education],
                  ["城市", profile.city],
                  ["毕业年份", `${profile.graduationYear} 届`],
                  ["报名类型", candidate.applicationType]
                ].map(([label, value]) => <InfoPanel key={label} title={label} text={value} />)}
              </div>
            </div>
            <div className="quest-card p-5">
              <h3 className="text-xl font-black text-slate-900">经历识别</h3>
              <ProfileList title="实习经历" items={profile.internships} />
              <ProfileList title="项目经历" items={profile.projects} />
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.map((skill) => <span key={skill} className="badge border-blue-200 bg-blue-50 text-blue-700">{skill}</span>)}
              </div>
            </div>
          </div>

          <div className="quest-card p-5">
            <h3 className="text-xl font-black text-slate-900">AI 简历总结</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{profile.resumeSummary}</p>
          </div>

          <div className="quest-card p-5">
            <h3 className="text-xl font-black text-slate-900">岗位匹配建议</h3>
            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {profile.recommendedJobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-slate-900">{job.title}</h4>
                      <p className="mt-1 text-sm font-bold text-slate-500">{job.department}</p>
                    </div>
                    <span className="badge border-blue-200 bg-blue-50 text-blue-700">匹配度{job.matchLevel}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{job.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="quest-card p-5">
              <h3 className="text-xl font-black text-slate-900">简历优化建议</h3>
              <ProfileList items={profile.optimizationTips} />
            </div>
            <div className="quest-card p-5">
              <h3 className="text-xl font-black text-slate-900">面试准备建议</h3>
              <ProfileList items={profile.interviewTips} />
            </div>
          </div>
        </>
      ) : (
        <div className="quest-card p-8 text-center">
          <h3 className="text-xl font-black text-slate-900">等待简历解析</h3>
          <p className="mt-2 text-sm text-slate-500">上传文件后点击“开始解析”，这里会展示真实识别出的基础信息、经历、推荐岗位和准备建议。如果暂时没有可复制文字的 PDF/DOCX，可以点击“使用示例简历测试”体验完整流程。</p>
        </div>
      )}
    </section>
  );
}

function ProfileList({ title, items }: { title?: string; items: string[] }) {
  return (
    <div className="mt-4">
      {title && <div className="mb-2 text-sm font-black text-slate-700">{title}</div>}
      <div className="space-y-2 text-sm font-semibold leading-6 text-slate-600">
        {items.map((item) => <p key={item}>• {item}</p>)}
      </div>
    </div>
  );
}

function buildMockInterviewQuestions(profile: CandidateProfile) {
  const firstJob = profile.recommendedJobs[0]?.title ?? profile.targetRoles[0] ?? "目标岗位";
  return [
    `你为什么优先选择${firstJob}？`,
    `请结合 ${profile.projects[0] ?? "一个核心项目"} 讲一次完整项目复盘。`,
    `你的技能标签里有 ${profile.skills.slice(0, 3).join("、")}，分别在哪些经历中用到了？`,
    `如果入职后遇到跨团队推进卡点，你会怎么处理？`
  ];
}

function ResumeUploadCard({ candidate, onResumeUpload, compact = false }: { candidate: Candidate; onResumeUpload: (file: File) => void; compact?: boolean }) {
  const statusText: Record<Candidate["resumeAnalysisStatus"], string> = {
    not_uploaded: "待上传",
    analyzing: "AI 解析中",
    completed: "解析完成",
    failed: "解析失败，请重新上传"
  };

  return (
    <div className="quest-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-black text-blue-600">我的简历</div>
          <h2 className="mt-1 text-2xl font-black text-slate-900">一键上传简历</h2>
          <p className="mt-2 text-sm text-slate-500">支持可复制文字的 PDF / DOCX。上传后，YOU鹅 会真实提取简历文本并生成岗位方向、优化建议和面试准备建议。</p>
        </div>
        <label className="task-button cursor-pointer">
          选择文件
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onResumeUpload(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <InfoPanel title="解析状态" text={statusText[candidate.resumeAnalysisStatus ?? "not_uploaded"]} />
        <InfoPanel title="文件名" text={candidate.resumeFileName ?? "暂未上传"} />
        <InfoPanel title="上传时间" text={candidate.resumeUploadedAt ?? "待上传"} />
      </div>
      {candidate.resumeAnalysisStatus === "analyzing" && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-700">AI 正在分析简历...</div>
      )}
      {candidate.resumeAnalysisStatus === "completed" && candidate.resumeAnalysis && !compact && (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-900">简历亮点总结</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{candidate.resumeAnalysis.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.resumeAnalysis.strengths.map((item) => <span key={item} className="badge border-blue-200 bg-blue-50 text-blue-700">{item}</span>)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-900">优化与准备建议</h3>
            <div className="mt-2 space-y-2 text-sm text-slate-500">
              {candidate.resumeAnalysis.optimizationTips.concat(candidate.resumeAnalysis.interviewTips).map((item) => <p key={item}>• {item}</p>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function candidateFriendlyStage(stage: NonNullable<Candidate["activeApplicationStage"]>) {
  const labels: Record<NonNullable<Candidate["activeApplicationStage"]>, string> = {
    none: "暂无主推进流程",
    applied: "已投递",
    evaluation: "进入评估",
    interview: "面试中",
    passed: "面试通过",
    onboarded: "已入职",
    rejected: "流程已结束",
    cancelled: "已取消"
  };
  return labels[stage];
}

function candidateNextStep(candidate: Candidate) {
  if (candidate.activeApplicationStage === "evaluation") return "等待评估结果，你可以先准备项目复盘和岗位理解案例。";
  if (candidate.activeApplicationStage === "interview") return "请按时参加面试，并提前确认设备、地点和可沟通时间。";
  if (candidate.activeApplicationStage === "passed") return "等待后续沟通，你可以提前整理入职时间和材料。";
  if (candidate.activeApplicationStage === "onboarded") return "流程已完成，祝你新的阶段顺利。";
  if (candidate.activeApplicationStage === "cancelled" || candidate.activeApplicationStage === "rejected") return "当前流程已结束，你可以关注其他推荐岗位。";
  return "你可以先上传简历，YOU鹅 会帮你分析更适合的岗位方向。";
}

function sortSlots(slots: string[]) {
  return [...slots].sort((a, b) => {
    const dayA = week.findIndex((day) => a.startsWith(day));
    const dayB = week.findIndex((day) => b.startsWith(day));
    if (dayA !== dayB) return dayA - dayB;
    return a.localeCompare(b, "zh-CN");
  });
}

function keepOneSlotPerDay(slots: string[]) {
  const seen = new Set<string>();
  return sortSlots(slots).filter((slot) => {
    const day = slot.split(" ")[0];
    if (seen.has(day)) return false;
    seen.add(day);
    return true;
  });
}

function truncateText(text: string, maxLength = 200) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function normalizeState(saved: AppState): AppState {
  return {
    ...initialState,
    ...saved,
    candidates: saved.candidates.map((candidate, index) => {
      const fallback = initialState.candidates[index] ?? initialState.candidates[0];
      return {
        ...fallback,
        ...candidate,
        applicationType: candidate.applicationType ?? fallback.applicationType,
        graduationYear: candidate.graduationYear ?? fallback.graduationYear,
        expectedGraduationDate: candidate.expectedGraduationDate ?? fallback.expectedGraduationDate,
        projects: candidate.projects ?? fallback.projects,
        targetDirection: candidate.targetDirection ?? fallback.targetDirection,
        interviewPreference: candidate.interviewPreference ?? fallback.interviewPreference
      };
    }),
    jobs: saved.jobs.map((job, index) => ({
      ...(initialState.jobs[index] ?? initialState.jobs[0]),
      ...job
    })),
    scheduledInterviews: normalizeScheduledInterviews(saved.scheduledInterviews ?? initialState.scheduledInterviews)
  };
}

function normalizeBusinessInterviewers(interviewers: BusinessInterviewer[]) {
  return interviewers.map((interviewer) => {
    const fallback = interviewerPool.find((item) => item.id === interviewer.id);
    return {
      ...(fallback ?? interviewer),
      ...interviewer,
      scheduledInterviews: normalizeScheduledInterviews(interviewer.scheduledInterviews ?? fallback?.scheduledInterviews ?? [])
    };
  });
}

function normalizeScheduledInterviews(interviews: unknown): ScheduledInterview[] {
  if (!Array.isArray(interviews)) return initialState.scheduledInterviews;
  return interviews.map((item, index) => {
    const raw = item as Partial<ScheduledInterview> & {
      interviewId?: string;
      slot?: string;
    };
    const fallbackCandidate = initialState.candidates.find((candidate) => candidate.id === raw.candidateId) ?? initialState.candidates[index % initialState.candidates.length];
    const fallbackJob = initialState.jobs.find((job) => job.id === raw.jobId || job.title === raw.jobTitle) ?? initialState.jobs.find((job) => job.title === fallbackCandidate.appliedRole) ?? initialState.jobs[0];
    const fallbackInterviewer = interviewerPool.find((interviewer) => interviewer.id === raw.interviewerId || interviewer.name === raw.interviewerName) ?? interviewerPool[index % interviewerPool.length];
    return {
      id: raw.id ?? raw.interviewId ?? `si-migrated-${index}`,
      candidateId: raw.candidateId ?? fallbackCandidate.id,
      candidateName: raw.candidateName ?? fallbackCandidate.name,
      jobId: raw.jobId ?? fallbackJob.id,
      jobTitle: raw.jobTitle ?? fallbackJob.title,
      interviewerId: raw.interviewerId ?? fallbackInterviewer.id,
      interviewerName: raw.interviewerName ?? fallbackInterviewer.name,
      interviewTime: raw.interviewTime ?? raw.slot ?? fallbackInterviewer.availableSlots[0] ?? "周三 15:00-16:00",
      round: raw.round ?? "一面",
      status: raw.status ?? "待面试"
    };
  });
}

function HrWorkspace(props: {
  active: string;
  state: AppState;
  promoteToEvaluation: (candidate: Candidate) => void;
  arrangeInterview: (candidate: Candidate) => void;
  batchPromote: () => void;
  aiPhone: (candidate: Candidate) => void;
  onboard: (candidate: Candidate) => void;
  markLost: (candidate: Candidate) => void;
  setSelectedCandidate: (candidate: Candidate) => void;
  setModal: (modal: AppModal | null) => void;
}) {
  if (props.active === "人才库") return <TalentPool {...props} />;
  if (props.active === "岗位候选人") return <JobCandidateList {...props} />;
  if (props.active === "评估中") return <EvaluationList {...props} />;
  if (props.active === "面试中") return <InterviewProgressList {...props} />;
  if (props.active === "面试通过") return <OfferPassedList {...props} />;
  if (props.active === "已入职") return <OnboardedList {...props} />;
  return <DataDashboard state={props.state} />;
}

function TalentPool({ state, aiPhone, setSelectedCandidate }: Pick<Parameters<typeof HrWorkspace>[0], "state" | "aiPhone" | "setSelectedCandidate">) {
  const highGoose = state.candidates.filter((candidate) => candidate.gooseScore >= 80).length;
  const highPigeon = state.candidates.filter((candidate) => candidate.pigeonScore >= 75).length;
  return (
    <section className="space-y-5">
      <MetricGrid items={[
        ["人才库总人数", state.candidates.length],
        ["高鹅值候选人", highGoose],
        ["高鸽值候选人", highPigeon],
        ["可寻访候选人", state.candidates.filter((candidate) => candidate.currentStage === "talent").length]
      ]} />
      <div className="quest-card p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-6">
          {["岗位方向", "学校", "专业", "报名类型", "毕业年份", "技能"].map((filter) => <input key={filter} placeholder={filter} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />)}
        </div>
        <CandidateGrid candidates={state.candidates} onDetail={setSelectedCandidate} actions={(candidate) => <button className="task-button" onClick={() => aiPhone(candidate)}>一键寻访</button>} />
      </div>
      <div className="quest-card p-5">
        <h3 className="text-xl font-black text-slate-900">AI 找人</h3>
        <p className="mt-2 text-sm text-slate-500">输入：“帮我找适合产品运营实习生的候选人。” AI 推荐：林栖羽、周予安、陆景和。理由：技能匹配、鹅值高，且有明确项目复盘证据。</p>
      </div>
    </section>
  );
}

function JobCandidateList({ state, promoteToEvaluation, batchPromote, setSelectedCandidate }: Pick<Parameters<typeof HrWorkspace>[0], "state" | "promoteToEvaluation" | "batchPromote" | "setSelectedCandidate">) {
  const [jobId, setJobId] = useState(state.jobs[0].id);
  const job = state.jobs.find((item) => item.id === jobId) ?? state.jobs[0];
  const candidates = state.candidates.filter((candidate) => candidate.appliedRole === job.title && ["talent", "job"].includes(candidate.currentStage));
  return (
    <section className="space-y-5">
      <div className="quest-card flex flex-wrap items-center justify-between gap-4 p-5">
        <select value={jobId} onChange={(event) => setJobId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-800">
          {state.jobs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <div className="text-sm font-bold text-slate-500">HC {job.hcFilled}/{job.hcTarget}｜完成度 {job.completionRate}%｜风险值 {job.riskScore}</div>
        <button className="task-button" onClick={batchPromote}>AI 一键批量推进评估</button>
      </div>
      <div className="quest-card grid gap-3 p-4 md:grid-cols-2">
        <input placeholder="筛选报名类型：日常实习 / 暑期实习 / 校园招聘 / 社招" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
        <input placeholder="筛选毕业年份：2026 / 2027 / 2028" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
      </div>
      <CandidateGrid candidates={candidates} onDetail={setSelectedCandidate} actions={(candidate) => (
        <div className="flex gap-2">
          <button className="task-button" onClick={() => promoteToEvaluation(candidate)}>推进评估</button>
          <button className="ghost-button">暂缓</button>
        </div>
      )} />
    </section>
  );
}

function EvaluationList({ state, arrangeInterview, setSelectedCandidate, setModal }: Pick<Parameters<typeof HrWorkspace>[0], "state" | "arrangeInterview" | "setSelectedCandidate" | "setModal">) {
  const candidates = state.candidates.filter((candidate) => candidate.currentStage === "evaluating");
  return (
    <section className="space-y-4">
      <CandidateFilterBar />
      <CandidateGrid candidates={candidates} onDetail={setSelectedCandidate} actions={(candidate) => (
        <div className="flex flex-wrap gap-2">
          <button className="ghost-button" onClick={() => setModal({ type: "info", text: `AI 已提醒业务方尽快反馈 ${candidate.name}。` })}>催业务反馈</button>
          <button className="task-button" onClick={() => arrangeInterview(candidate)}>一键约面</button>
          <button className="ghost-button" onClick={() => setModal({ type: "info", text: truncateText(`${candidate.name} AI 评估摘要：硬性条件匹配、经历相关，风险为 ${candidate.riskReasons.join("、")}。`) })}>查看 AI 评估摘要</button>
        </div>
      )} />
    </section>
  );
}

function InterviewProgressList({ state, setSelectedCandidate }: Pick<Parameters<typeof HrWorkspace>[0], "state" | "setSelectedCandidate">) {
  const candidates = state.candidates.filter((candidate) => candidate.currentStage === "interviewing");
  return (
    <section className="space-y-5">
      <MetricGrid items={[["HC 目标人数", 15], ["当前面试中人数", candidates.length], ["面试通过人数", state.candidates.filter((candidate) => candidate.currentStage === "passed").length], ["当前岗位风险值", 72]]} />
      <CandidateFilterBar />
      <CandidateGrid candidates={candidates} onDetail={setSelectedCandidate} actions={(candidate) => <span className="rounded-lg bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700">AI 动态：等待反馈超过 48 小时将推高鸽值，建议催面试官反馈。</span>} />
    </section>
  );
}

function OfferPassedList({ state, onboard, markLost, setSelectedCandidate }: Pick<Parameters<typeof HrWorkspace>[0], "state" | "onboard" | "markLost" | "setSelectedCandidate">) {
  const candidates = state.candidates.filter((candidate) => ["passed", "lost"].includes(candidate.currentStage));
  return <section className="space-y-4"><CandidateFilterBar /><CandidateGrid candidates={candidates} onDetail={setSelectedCandidate} actions={(candidate) => (
    <div className="flex flex-wrap gap-2">
      {candidate.currentStage === "lost" ? <button className="task-button">AI 自动补位</button> : <button className="task-button" onClick={() => onboard(candidate)}>确认入职</button>}
      <button className="danger-button" onClick={() => markLost(candidate)}>标记已鸽</button>
      <button className="ghost-button">查看流失原因</button>
    </div>
  )} /></section>;
}

function OnboardedList({ state, setSelectedCandidate }: Pick<Parameters<typeof HrWorkspace>[0], "state" | "setSelectedCandidate">) {
  return <section className="space-y-4"><CandidateFilterBar /><CandidateGrid candidates={state.candidates.filter((candidate) => candidate.currentStage === "onboarded")} onDetail={setSelectedCandidate} actions={() => <span className="text-sm font-bold text-goose">{truncateText("AI 复盘：流程推进快，鸽值下降明显，可沉淀为成功鸽鹅画像。", 120)}</span>} /></section>;
}

function BusinessWorkspace(props: {
  active: string;
  state: AppState;
  selectedInterviewerId: string;
  setSelectedInterviewerId: (id: string) => void;
  interviewers: BusinessInterviewer[];
  setInterviewers: React.Dispatch<React.SetStateAction<BusinessInterviewer[]>>;
  businessPass: (candidate: Candidate) => void;
  businessReject: (candidate: Candidate) => void;
  submitFeedback: (candidate: Candidate) => void;
  updateCandidate: (id: string, patch: Partial<Candidate>, log?: string) => void;
  setSelectedCandidate: (candidate: Candidate) => void;
  setModal: (modal: AppModal | null) => void;
}) {
  const selectedInterviewer = props.interviewers.find((item) => item.id === props.selectedInterviewerId) ?? props.interviewers[0];
  const canEvaluate = selectedInterviewer?.level === "P1";
  const updateSelectedInterviewer = (patch: Partial<BusinessInterviewer>) => {
    props.setInterviewers((items) => items.map((item) => item.id === selectedInterviewer.id ? { ...item, ...patch } : item));
  };
  const currentInterviews = props.state.scheduledInterviews.filter((interview) => interview.interviewerId === selectedInterviewer?.id);
  const shell = (children: ReactNode) => (
    <section className="space-y-5">
      <BusinessInterviewerSelector
        interviewers={props.interviewers}
        selectedInterviewerId={props.selectedInterviewerId}
        onChange={props.setSelectedInterviewerId}
      />
      <UpcomingInterviewCandidates
        interviews={currentInterviews}
        candidates={props.state.candidates}
        jobs={props.state.jobs}
        setModal={props.setModal}
      />
      {children}
    </section>
  );
  if (props.active === "评估") {
    const candidates = props.state.candidates.filter((candidate) => candidate.currentStage === "evaluating");
    if (!canEvaluate) {
      return shell(
        <div className="quest-card p-8 text-center">
          <h2 className="text-2xl font-black text-slate-900">当前面试官暂无评估权限</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">仅 P1 级别可进行候选人评估。P2 / P3 面试官仍可进入“面试”和“动态数据”。</p>
        </div>
      );
    }
    return shell(
      <>
        <CandidateFilterBar />
        <CandidateGrid candidates={candidates} onDetail={props.setSelectedCandidate} actions={(candidate) => (
          <div className="flex flex-wrap gap-2">
            <button className="task-button" onClick={() => props.businessPass(candidate)}>通过</button>
            <button className="danger-button" onClick={() => props.businessReject(candidate)}>不通过</button>
            <button className="ghost-button">参考 AI 批量通过</button>
          </div>
        )} />
      </>
    );
  }
  if (props.active === "面试") {
    return shell(
      <section className="grid gap-5 xl:grid-cols-[440px_1fr]">
        <BusinessSchedulePanel interviewer={selectedInterviewer} onSave={updateSelectedInterviewer} />
        <div className="space-y-4">
          <CandidateFilterBar />
          <BusinessInterviewScheduleList
            interviews={currentInterviews}
            candidates={props.state.candidates}
            jobs={props.state.jobs}
            onDetail={props.setSelectedCandidate}
            onReschedule={(candidate) => props.setModal({ type: "reschedule", candidate, text: `面试官申请改面。一键约面改面 Agent 已重新读取双方可面时间、组内面试官负载和岗位 HC 紧急程度。
推荐新时间：${candidate.availableSlots[1] ?? "周三 15:00-16:00"}
确认后将同步候选人端、HR 端和业务方端。` })}
            onFeedback={props.submitFeedback}
          />
        </div>
      </section>
    );
  }
  return shell(<DataDashboard state={props.state} business />);
}

function CandidateFilterBar() {
  return (
    <div className="quest-card grid gap-3 p-4 md:grid-cols-4">
      <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" defaultValue="">
        <option value="">全部报名类型</option>
        {["日常实习", "暑期实习", "校园招聘", "社招"].map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" defaultValue="">
        <option value="">全部毕业年份</option>
        {["2026", "2027", "2028", "2029"].map((item) => <option key={item}>{item} 届</option>)}
      </select>
      <input placeholder="搜索学校 / 专业" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
      <input placeholder="搜索岗位 / 技能" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
    </div>
  );
}

function UpcomingInterviewCandidates({
  interviews,
  candidates,
  jobs,
  setModal
}: {
  interviews: ScheduledInterview[];
  candidates: Candidate[];
  jobs: Job[];
  setModal: (modal: AppModal | null) => void;
}) {
  const activeInterviews = interviews.filter((interview) => !["已取消", "已完成"].includes(interview.status));
  return (
    <section className="quest-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-900">即将面试的候选人</h3>
          <p className="mt-1 text-sm text-slate-500">当前面试官名下的候选人安排会随上方面试官选择实时变化。</p>
        </div>
        <span className="badge border-blue-200 bg-blue-50 text-blue-700">{activeInterviews.length} 场待处理</span>
      </div>
      {activeInterviews.length ? (
        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          {activeInterviews.map((interview) => {
            const candidate = candidates.find((item) => item.id === interview.candidateId);
            const job = jobs.find((item) => item.id === interview.jobId);
            if (!candidate) return null;
            return (
              <details key={interview.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">{candidate.name}</h4>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="badge border-blue-200 bg-blue-50 text-blue-700">{candidate.applicationType}</span>
                        <span className="badge border-slate-200 bg-slate-50 text-slate-600">{candidate.graduationYear} 届</span>
                        <span className="badge border-slate-200 bg-white text-slate-600">{interview.round}</span>
                      </div>
                    </div>
                    <span className="badge border-orange-200 bg-orange-50 text-orange-700">{interview.status}</span>
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-600">{interview.jobTitle}｜{interview.interviewTime}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{truncateText(candidate.resumeSummary, 120)}</p>
                </summary>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoPanel title="学校 / 专业" text={`${candidate.school} / ${candidate.major}`} />
                    <InfoPanel title="实习经历" text={candidate.internships} />
                    <InfoPanel title="技能标签" text={candidate.skills.join("、")} />
                    <InfoPanel title="岗位 JD 摘要" text={truncateText(job?.jd ?? "暂无岗位 JD", 120)} />
                  </div>
                  <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-700">
                    AI 建议考察点：{buildBusinessQuestionHints(candidate, job).join("；")}
                  </div>
                  <button className="ghost-button mt-3" onClick={() => setModal({ type: "info", text: `AI 推荐面试问题：\n${buildBusinessQuestionHints(candidate, job).map((item, index) => `${index + 1}. ${item}`).join("\n")}` })}>AI 推荐面试问题</button>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
          当前暂无即将面试的候选人。你可以先设置可面试时间，等待 HR 发起约面。
        </div>
      )}
    </section>
  );
}

function BusinessInterviewScheduleList({
  interviews,
  candidates,
  jobs,
  onDetail,
  onReschedule,
  onFeedback
}: {
  interviews: ScheduledInterview[];
  candidates: Candidate[];
  jobs: Job[];
  onDetail: (candidate: Candidate) => void;
  onReschedule: (candidate: Candidate) => void;
  onFeedback: (candidate: Candidate) => void;
}) {
  const activeInterviews = interviews.filter((interview) => !["已取消", "已完成"].includes(interview.status));
  if (!activeInterviews.length) {
    return <div className="quest-card p-8 text-center text-slate-500">当前暂无即将面试的候选人。你可以先设置可面试时间，等待 HR 发起约面。</div>;
  }
  return (
    <div className="grid gap-4">
      {activeInterviews.map((interview) => {
        const candidate = candidates.find((item) => item.id === interview.candidateId);
        const job = jobs.find((item) => item.id === interview.jobId);
        if (!candidate) return null;
        return (
          <article key={interview.id} className="quest-card p-4">
            <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{candidate.name}</h3>
                  <span className="badge border-blue-200 bg-blue-50 text-blue-700">{candidate.applicationType}</span>
                  <span className="badge border-slate-200 bg-slate-50 text-slate-600">{candidate.graduationYear} 届</span>
                  <span className="badge border-orange-200 bg-orange-50 text-orange-700">{interview.status}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-600">{interview.jobTitle}｜{interview.round}｜{interview.interviewTime}</p>
                <p className="mt-2 text-sm text-slate-500">{truncateText(candidate.resumeSummary, 140)}</p>
                <p className="mt-2 text-xs font-bold text-blue-700">AI 建议：{buildBusinessQuestionHints(candidate, job).slice(0, 2).join("；")}</p>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <button className="ghost-button" onClick={() => onDetail(candidate)}>查看候选人详情</button>
                <button className="ghost-button" onClick={() => onReschedule(candidate)}>申请改面</button>
                <button className="task-button" onClick={() => onFeedback(candidate)}>AI 整理面评并提交</button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function buildBusinessQuestionHints(candidate: Candidate, job?: Job) {
  return [
    `围绕 ${candidate.projects[0] ?? candidate.internships} 深挖候选人的真实贡献`,
    `确认候选人对「${job?.title ?? candidate.appliedRole}」核心职责的理解`,
    `验证 ${candidate.skills.slice(0, 3).join("、")} 等关键技能的实操证据`,
    "确认求职意愿、其他机会、到岗时间和稳定性"
  ];
}

function BusinessInterviewerSelector({ interviewers, selectedInterviewerId, onChange }: { interviewers: BusinessInterviewer[]; selectedInterviewerId: string; onChange: (id: string) => void }) {
  const selected = interviewers.find((item) => item.id === selectedInterviewerId) ?? interviewers[0];
  return (
    <div className="quest-card p-5">
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div>
          <label className="text-sm font-black text-blue-600">选择当前面试官</label>
          <select value={selected.id} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
            {interviewers.map((item) => <option key={item.id} value={item.id}>{item.name}｜{item.id}｜{item.level}｜{item.businessDirection}</option>)}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <InfoPanel title="姓名 / 编号" text={`${selected.name} / ${selected.id}`} />
          <InfoPanel title="职级 / 岗位方向" text={`${selected.level} / ${selected.jobRole}`} />
          <InfoPanel title="业务方向 / +1" text={`${selected.businessDirection} / ${selected.managerName ?? "无"}`} />
          <InfoPanel title="个人风格" text={selected.personalStyle} />
        </div>
      </div>
    </div>
  );
}

function BusinessSchedulePanel({ interviewer, onSave }: { interviewer: BusinessInterviewer; onSave: (patch: Partial<BusinessInterviewer>) => void }) {
  const [availableSlots, setAvailableSlots] = useState(interviewer.availableSlots);
  const [preferenceInput, setPreferenceInput] = useState(interviewer.schedulePreference ?? "");
  const [preference, setPreference] = useState({
    maxInterviewsPerWeek: interviewer.maxInterviewsPerWeek,
    maxInterviewsPerDay: interviewer.maxInterviewsPerDay,
    preferredTimeOfDay: interviewer.preferredTimeOfDay ?? "不限",
    blockedDays: interviewer.blockedDays ?? []
  });

  useEffect(() => {
    setAvailableSlots(interviewer.availableSlots);
    setPreferenceInput(interviewer.schedulePreference ?? "");
    setPreference({
      maxInterviewsPerWeek: interviewer.maxInterviewsPerWeek,
      maxInterviewsPerDay: interviewer.maxInterviewsPerDay,
      preferredTimeOfDay: interviewer.preferredTimeOfDay ?? "不限",
      blockedDays: interviewer.blockedDays ?? []
    });
  }, [interviewer]);

  const occupiedSlots = new Set((interviewer.scheduledInterviews ?? []).map((item) => item.interviewTime));
  const toggleSlot = (slot: string) => {
    if (occupiedSlots.has(slot)) return;
    setAvailableSlots((items) => items.includes(slot) ? items.filter((item) => item !== slot) : [...items, slot]);
  };
  const applyPreference = () => {
    let next = [...availableSlots];
    const patch = {
      schedulePreference: preferenceInput,
      maxInterviewsPerWeek: preference.maxInterviewsPerWeek,
      maxInterviewsPerDay: preference.maxInterviewsPerDay,
      preferredTimeOfDay: preference.preferredTimeOfDay,
      blockedDays: preference.blockedDays
    };
    if (preferenceInput.includes("一周就安排两次")) {
      next = sortSlots(next).slice(0, 2);
      patch.maxInterviewsPerWeek = 2;
    }
    if (preferenceInput.includes("周三") && preferenceInput.includes("不要")) {
      next = next.filter((slot) => !slot.startsWith("周三"));
      patch.blockedDays = [...new Set([...(patch.blockedDays ?? []), "周三"])];
    }
    if (preferenceInput.includes("上午")) {
      next = next.filter((slot) => slot.includes("09:00") || slot.includes("10:00"));
      patch.preferredTimeOfDay = "上午";
    }
    if (preferenceInput.includes("每天最多一场")) {
      next = keepOneSlotPerDay(next);
      patch.maxInterviewsPerDay = 1;
    }
    setAvailableSlots(next);
    setPreference(patch);
  };
  return (
    <aside className="quest-card p-5">
      <h3 className="text-xl font-black text-slate-900">我的可面试时间</h3>
      <p className="mt-2 text-sm text-slate-500">点击时间块切换可面试 / 不可面试；已被安排的时间不可取消。</p>
      <div className="mt-4 space-y-3">
        {week.slice(0, 5).map((day, dayIndex) => {
          const dayTimes = dayIndex % 2 === 0 ? times : ["10:00-11:00", "14:00-15:00", "16:00-17:00"];
          return (
            <div key={day}>
              <div className="mb-2 text-sm font-black text-slate-700">{day}</div>
              <div className="grid grid-cols-2 gap-2">
                {dayTimes.map((time) => {
                  const slot = `${day} ${time}`;
                  const occupied = occupiedSlots.has(slot);
                  const selected = availableSlots.includes(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => toggleSlot(slot)}
                      className={`rounded-lg border px-2 py-2 text-xs font-bold ${occupied ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500" : selected ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                    >
                      {time}｜{occupied ? "已被安排" : selected ? "可面试" : "不可面试"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button className="task-button mt-4 w-full" onClick={() => onSave({ availableSlots })}>保存可面时间</button>
      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <h4 className="font-black text-blue-700">AI 排期偏好助手</h4>
        <textarea value={preferenceInput} onChange={(event) => setPreferenceInput(event.target.value)} placeholder="例如：最近项目太多，建议一周就安排两次面试；周三下午不要安排；尽量安排在上午；每天最多安排一场" className="mt-3 min-h-24 w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300" />
        <div className="mt-3 flex gap-2">
          <button className="ghost-button" onClick={applyPreference}>应用建议</button>
          <button className="task-button" onClick={() => onSave({ availableSlots, ...preference, schedulePreference: preferenceInput })}>保存偏好</button>
        </div>
        <p className="mt-3 text-xs font-bold text-blue-700">当前偏好：每周最多 {preference.maxInterviewsPerWeek ?? "不限"} 场｜每天最多 {preference.maxInterviewsPerDay ?? "不限"} 场｜偏好 {preference.preferredTimeOfDay}</p>
      </div>
    </aside>
  );
}

function DataDashboard({ state, business = false }: { state: AppState; business?: boolean }) {
  const avgGoose = Math.round(state.candidates.reduce((sum, c) => sum + c.gooseScore, 0) / state.candidates.length);
  const avgPigeon = Math.round(state.candidates.reduce((sum, c) => sum + c.pigeonScore, 0) / state.candidates.length);
  const funnel = stages.map((stage) => [stageLabel[stage], state.candidates.filter((candidate) => candidate.currentStage === stage).length] as const);
  return (
    <section className="space-y-5">
      <MetricGrid items={business ? [
        ["候选人总数", state.candidates.length],
        ["高鹅值候选人数", state.candidates.filter((candidate) => candidate.gooseScore >= 80).length],
        ["高鸽值候选人数", state.candidates.filter((candidate) => candidate.pigeonScore >= 75).length],
        ["平均反馈时间", "43h"]
      ] : [
        ["总候选人数", state.candidates.length],
        ["评估中人数", state.candidates.filter((candidate) => candidate.currentStage === "evaluating").length],
        ["平均鹅值", avgGoose],
        ["平均鸽值", avgPigeon],
        ["高风险 HC 数量", state.jobs.filter((job) => job.riskScore > 70).length]
      ]} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="quest-card p-5">
          <h3 className="text-xl font-black">招聘漏斗</h3>
          <div className="mt-4 space-y-3">
            {funnel.map(([label, value]) => <Bar key={label} label={label} value={value} max={8} />)}
          </div>
        </div>
        <div className="quest-card p-5">
          <h3 className="text-xl font-black">岗位风险榜</h3>
          <div className="mt-4 space-y-3">
            {state.jobs.map((job) => <Bar key={job.id} label={`${job.title}｜HC ${job.completionRate}%`} value={job.riskScore} max={100} danger />)}
          </div>
        </div>
      </div>
      <div className="quest-card p-5">
        <h3 className="text-xl font-black">AI 预警</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {["产品运营实习生岗位鹅值高且鸽值高的候选人较多，建议优先约面。", "数据分析实习生岗位业务反馈平均超过 48 小时，建议催办。", "内容运营岗位候选人池不足，建议启动人才库寻访。"].map((item) => <p key={item} className="rounded-[8px] border border-gold/30 bg-gold/10 p-4 text-sm font-bold text-gold">{truncateText(item)}</p>)}
        </div>
      </div>
      {!business && (
        <>
          <div className="quest-card p-5">
            <h3 className="text-xl font-black text-slate-900">AI 工具配置</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              {truncateText(`「YOU鹅」接入 ${modelName} 模型，用于候选人履历解析、岗位 JD 理解、评估摘要生成、面试问题推荐和沟通话术生成等多场景。项目采用“模型理解 + 规则判断”的方式，避免完全依赖黑箱决策。目前重点完成一键约面改面 Agent，后续将扩展人才画像 Agent、人才库寻访 Agent、面评整理 Agent 和 HC 风险预警 Agent。`)}
            </p>
            <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs font-bold text-blue-700">{mockAIResponse("一键约面改面 Agent")}</p>
          </div>
          <ProcessComparisonDiagram />
          <PersonaMatrixDiagram />
        </>
      )}
    </section>
  );
}

function ProcessComparisonDiagram() {
  const traditional = ["简历筛选", "人才库寻访", "HR 整理评估", "人工约面", "人工改面", "等待反馈", "offer 跟进"];
  const aiFlow = ["AI 解析简历/生成画像", "AI 辅助人才库寻访", "AI 生成评估摘要", "AI 一键约面", "AI 匹配面试官/技能/偏好/时间", "AI 改面协调", "AI 流失预警/自动补位 HC"];
  return (
    <section className="rounded-[8px] bg-white p-5 text-slate-950">
      <h3 className="text-xl font-black">传统招聘流程 vs AI 介入流程</h3>
      <div className="mt-5 grid gap-5">
        <div>
          <div className="mb-3 text-sm font-black">传统招聘流程</div>
          <div className="grid gap-2 md:grid-cols-7">
            {traditional.map((item, index) => (
              <div key={item} className={`rounded-[8px] border-2 p-3 text-center text-xs font-black ${index < 3 ? "border-blue-300 bg-blue-50" : "border-orange-300 bg-orange-50"}`}>
                {item}
                <div className="mt-2 text-[11px] font-bold">{index < 3 ? "人才信息差痛点" : "人工沟通痛点"}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-3 text-sm font-black">AI 介入后的招聘流程</div>
          <div className="grid gap-2 md:grid-cols-7">
            {aiFlow.map((item) => (
              <div key={item} className="rounded-[8px] border-2 border-emerald-400 bg-emerald-50 p-3 text-center text-xs font-black text-emerald-900">
                {item}
                <div className="mt-2 text-[11px] font-bold">AI 介入点</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PersonaMatrixDiagram() {
  return (
    <section className="rounded-[8px] bg-white p-5 text-slate-950">
      <h3 className="text-xl font-black">鸽鹅机制 16 种候选人形象图</h3>
      <div className="mt-4 grid grid-cols-[88px_repeat(4,1fr)] gap-2 text-center text-xs font-black">
        <div />
        {personaCols.map((col) => <div key={col} className="rounded-[8px] bg-slate-100 p-2">{col}</div>)}
        {personaMatrix.map((row, rowIndex) => (
          <>
            <div key={personaRows[rowIndex]} className="rounded-[8px] bg-slate-100 p-2">{personaRows[rowIndex]}</div>
            {row.map((persona) => {
              const isGoose = personaSpecies(persona) === "goose";
              return (
                <div key={persona} className={`rounded-[8px] border-2 p-3 ${isGoose ? "border-slate-300 bg-white" : "border-slate-400 bg-slate-200"}`}>
                  <img
                    src={getPersonaAsset(persona)}
                    alt={persona}
                    className="mx-auto h-20 w-24 object-contain"
                  />
                  <div className="mt-1">{persona}</div>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </section>
  );
}

function CandidateGrid({ candidates, onDetail, actions }: { candidates: Candidate[]; onDetail: (candidate: Candidate) => void; actions: (candidate: Candidate) => React.ReactNode }) {
  if (!candidates.length) return <div className="quest-card p-8 text-center text-slate-500">当前列表为空，AI Agent 正在继续巡视候选人池。</div>;
  return (
    <div className="grid gap-4">
      {candidates.map((candidate) => (
        <article key={candidate.id} className={`quest-card p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(31,41,55,.10)] ${candidate.pigeonScore >= 80 ? "border-red-200 bg-red-50/40" : candidate.pigeonScore < 35 ? "border-green-200" : ""}`}>
          <div className="grid gap-4 xl:grid-cols-[80px_1.2fr_1fr_1.2fr]">
            <PersonaAvatar candidate={candidate} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">{candidate.name}</h3>
                <PersonaBadge candidate={candidate} />
                <span className="badge border-slate-200 bg-slate-50 text-slate-600">{stageLabel[candidate.currentStage]}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-600">{candidate.school}｜{candidate.major}｜{candidate.internships}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="badge border-blue-200 bg-blue-50 text-blue-700">{candidate.applicationType}</span>
              <span className="badge border-slate-200 bg-slate-50 text-slate-600">{candidate.graduationYear} 届</span>
              <span className="badge border-slate-200 bg-white text-slate-600">{candidate.appliedRole}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">鸽鹅画像：{candidate.personaType}｜AI 动作：{truncateText(candidate.recommendationAction, 80)}</p>
            </div>
            <ScorePair candidate={candidate} />
            <div className="flex flex-col justify-between gap-3">
              <p className="text-sm leading-6 text-slate-500">
                {truncateText(`鹅值初筛：${candidate.gooseScore >= 80 ? "建议推进评估，岗位匹配强。" : candidate.gooseScore >= 60 ? "可进入观察或补充验证。" : "暂不优先推进。"} 鸽值预警：${candidate.pigeonScore >= 75 ? "建议加速约面或启动补位预案。" : candidate.pigeonScore >= 55 ? "需要关注回复和等待时长。" : "流失风险可控。"}`, 120)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button className="ghost-button" onClick={() => onDetail(candidate)}>查看详情</button>
                {actions(candidate)}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function PersonaAvatar({ candidate }: { candidate: Candidate }) {
  const isGoose = personaSpecies(candidate.personaType) === "goose";
  const danger = candidate.pigeonScore >= 75;
  const riskMark = candidate.personaType.includes("断线") ? "⌁" : candidate.personaType.includes("迷航") ? "?" : danger ? "!" : candidate.gooseScore >= 85 ? "★" : "";
  return (
    <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border p-1.5 ${danger ? "border-red-200 bg-red-50" : isGoose ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
      <img
        src={getPersonaAsset(candidate.personaType)}
        alt={candidate.personaType}
        className="h-full w-full object-contain"
      />
      {riskMark && <span className={`absolute -right-2 -top-2 rounded-full px-2 py-1 text-xs font-black ${danger ? "bg-red-500 text-white" : "bg-amber-400 text-slate-950"}`}>{riskMark}</span>}
    </div>
  );
}

function PersonaBadge({ candidate }: { candidate: Candidate }) {
  return (
    <span className="badge inline-flex items-center gap-1.5 border-blue-200 bg-blue-50 text-blue-700">
      <img src={getPersonaAsset(candidate.personaType)} alt="" className="h-5 w-5 object-contain" />
      {candidate.personaType}
    </span>
  );
}

function ScorePair({ candidate }: { candidate: Candidate }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ScoreCard label="鹅值" value={candidate.gooseScore} sub={`超过 ${candidate.goosePercentile}%`} tone="goose" />
      <ScoreCard label="鸽值" value={candidate.pigeonScore} sub={`风险 ${candidate.pigeonPercentile}%`} tone="pigeon" />
    </div>
  );
}

function ScoreCard({ label, value, sub, tone }: { label: string; value: number; sub: string; tone: "goose" | "pigeon" }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === "goose" ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}`}>
      <div className="text-xs font-black text-slate-500">{label}</div>
      <div className={`text-2xl font-black ${tone === "goose" ? "text-green-600" : value >= 75 ? "text-red-500" : "text-orange-500"}`}>{value}</div>
      <div className="text-xs font-bold text-slate-500">{sub}</div>
    </div>
  );
}

function ProcessTimeline({ stage }: { stage: Stage }) {
  const index = stages.indexOf(stage);
  return (
    <div className="mt-5 grid grid-cols-5 gap-2">
      {stages.slice(1).map((item, itemIndex) => {
        const done = itemIndex + 1 < index;
        const current = item === stage;
        return (
          <div key={item} className={`rounded-xl border p-3 text-center text-xs font-black ${current ? "border-blue-200 bg-blue-50 text-blue-700" : done ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
            <div className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-white">{done ? "✓" : itemIndex + 1}</div>
            <div className="mt-1">{stageLabel[item]}</div>
          </div>
        );
      })}
    </div>
  );
}

function InterviewCalendar({ candidate, updateCandidate }: { candidate: Candidate; updateCandidate: (id: string, patch: Partial<Candidate>, log?: string) => void }) {
  const [picked, setPicked] = useState<string[]>(candidate.availableSlots);
  return (
    <aside className="quest-card p-5">
      <h3 className="text-xl font-black text-slate-900">可面试时间</h3>
      <div className="mt-4 space-y-3">
        {week.slice(0, 5).map((day) => (
          <div key={day}>
            <div className="mb-2 text-sm font-black text-slate-700">{day}</div>
            <div className="grid grid-cols-2 gap-2">
              {times.map((time) => {
                const slot = `${day} ${time}`;
                const selected = picked.includes(slot);
                return <button key={slot} onClick={() => setPicked(selected ? picked.filter((item) => item !== slot) : [...picked, slot])} className={`rounded-lg border px-2 py-2 text-xs font-bold ${selected ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{time}</button>;
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="task-button mt-4 w-full" onClick={() => updateCandidate(candidate.id, { availableSlots: picked }, `${candidate.name} 更新可面试时间。`)}>保存</button>
    </aside>
  );
}

function AIChatPanel({ chat, sendChat, candidate, profile }: { chat: { from: string; text: string }[]; sendChat: (text: string) => void | Promise<void>; candidate: Candidate; profile: CandidateProfile | null }) {
  const [value, setValue] = useState("");
  const quick = ["我的简历适合什么岗位？", "我的简历有哪些亮点？", "我的简历哪里需要优化？", "根据我的经历帮我准备面试", "我应该优先投哪个岗位？"];
  return (
    <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <div className="quest-card flex flex-col items-center justify-center p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xl font-black text-blue-600">AI</div>
        <h2 className="mt-4 text-2xl font-black text-slate-900">YOU鹅 AI 助手</h2>
        <p className="mt-2 text-sm text-slate-500">会结合你的简历，帮你分析适合岗位、优化表达，并生成面试准备建议。</p>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-700">
          简历状态：{profile ? `已解析 ${profile.name}｜${profile.school}｜${profile.major}` : candidate.resumeAnalysisStatus === "analyzing" ? "AI 解析中" : "请先在左侧「解析简历」上传简历"}
        </div>
        {profile && <p className="mt-4 text-left text-sm leading-6 text-slate-500">当前推荐方向：{profile.recommendedJobs.map((job) => `${job.title}（${job.matchLevel}）`).join("、")}</p>}
      </div>
      <div className="quest-card flex h-[680px] flex-col p-5">
        <div className="flex-1 space-y-3 overflow-auto pr-2">
          {chat.map((message, index) => <div key={index} className={`max-w-[78%] rounded-2xl p-3 text-sm font-semibold leading-6 ${message.from === "ai" ? "bg-slate-100 text-slate-700" : "ml-auto bg-blue-600 text-white"}`}>{message.text}</div>)}
        </div>
        <div className="my-4 flex flex-wrap gap-2">
          {quick.map((item) => <button key={item} className="ghost-button" onClick={() => sendChat(item)}>{item}</button>)}
        </div>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (value.trim()) { sendChat(value); setValue(""); } }}>
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="输入你想问 AI 的问题" className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
          <button className="task-button">发送</button>
        </form>
      </div>
    </section>
  );
}

function CandidateDetail({ role, candidate, onClose }: { role: Role; candidate: Candidate; onClose: () => void }) {
  const canSeeScores = role !== "candidate";
  if (role === "candidate") {
    const analysis = candidate.resumeAnalysis;
    const processNotes = [
      `当前阶段：${candidateFriendlyStage(candidate.activeApplicationStage ?? "none")}`,
      candidate.resumeFileName ? `已上传简历：${candidate.resumeFileName}` : "尚未上传简历",
      candidate.interviewHistory.length ? `面试记录：${candidate.interviewHistory.join("、")}` : "当前暂无已确认面试"
    ];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
        <div className="quest-card max-h-[90vh] w-full max-w-4xl overflow-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-3xl font-black text-blue-600">简</div>
              <div>
                <h2 className="text-3xl font-black text-slate-900">{candidate.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{candidate.resumeSummary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="badge border-blue-200 bg-blue-50 text-blue-700">{candidate.applicationType}</span>
                  <span className="badge border-slate-200 bg-slate-50 text-slate-600">{candidate.graduationYear} 届</span>
                </div>
              </div>
            </div>
            <button className="ghost-button" onClick={onClose}>关闭</button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <InfoPanel title="当前岗位" text={candidate.appliedRole} />
            <InfoPanel title="报名类型" text={candidate.applicationType} />
            <InfoPanel title="毕业年份" text={`${candidate.graduationYear} 届`} />
            <InfoPanel title="当前阶段" text={candidateFriendlyStage(candidate.activeApplicationStage ?? "none")} />
            <InfoPanel title="下一步安排" text={candidateNextStep(candidate)} />
          </div>

          <div className="mt-5 quest-card p-5">
            <h3 className="text-xl font-black">流程进度</h3>
            <ProcessTimeline stage={candidate.currentStage} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <h3 className="font-black text-blue-700">AI 简历分析</h3>
              {analysis ? (
                <div className="mt-3 space-y-3 text-sm font-semibold leading-6 text-slate-600">
                  <p>{analysis.summary}</p>
                  <div>
                    <div className="font-black text-slate-900">简历亮点</div>
                    {analysis.strengths.map((item) => <p key={item}>• {item}</p>)}
                  </div>
                  <div>
                    <div className="font-black text-slate-900">适合岗位方向</div>
                    {analysis.recommendedRoles.map((item) => (
                      <p key={item.roleId}>• {item.roleTitle}：匹配度{item.matchLevel}，{item.reason}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">请先上传简历，YOU鹅 会帮你整理适合岗位方向和优化建议。</p>
              )}
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <h3 className="font-black text-amber-700">面试准备建议</h3>
              <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600">
                {(analysis?.interviewTips ?? ["准备 2 个项目复盘案例，重点说明目标、动作、结果。", "提前熟悉岗位 JD，准备与岗位职责相关的问题。", "面试前确认时间、设备和网络环境。"]).map((item) => <p key={item}>• {item}</p>)}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-900">流程记录</h3>
            <div className="mt-3 space-y-2 text-sm text-slate-500">
              {processNotes.map((note) => <p key={note}>• {note}</p>)}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
      <div className="quest-card max-h-[90vh] w-full max-w-4xl overflow-auto p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <PersonaAvatar candidate={candidate} />
            <div>
              <h2 className="text-3xl font-black text-slate-900">{candidate.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{truncateText(candidate.resumeSummary)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="badge border-blue-200 bg-blue-50 text-blue-700">{candidate.applicationType}</span>
                <span className="badge border-slate-200 bg-slate-50 text-slate-600">{candidate.graduationYear} 届</span>
              </div>
            </div>
          </div>
          <button className="ghost-button" onClick={onClose}>关闭</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {canSeeScores ? <ScorePair candidate={candidate} /> : (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <h3 className="font-black text-blue-700">流程建议</h3>
              <p className="mt-2 text-sm text-slate-500">YOU鹅 会基于流程进度、岗位 JD 和面试安排给出建议；候选人端只展示可执行建议，不展示完整鸽鹅机制算法。</p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-black text-slate-900">AI 推荐动作</h3>
            <p className="mt-2 text-sm text-slate-500">{truncateText(`${candidate.recommendationAction}。原因：技能为 ${candidate.skills.join("、")}，风险为 ${candidate.riskReasons.join("、")}。`)}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoPanel title="鸽鹅机制" text="鹅值表示候选人与当前岗位的匹配度，回答“值不值得推进”；鸽值表示候选人的流失风险，回答“还能不能等”。" />
          <InfoPanel title="报名与毕业" text={`${candidate.applicationType}｜${candidate.graduationYear} 届｜预计毕业：${candidate.expectedGraduationDate ?? candidate.graduationYear}`} />
          <InfoPanel title="动态变化原因" text={truncateText(canSeeScores ? candidate.scoreChangeReasons.join(" ") : "进入评估、面试、改面、offer 等阶段时，YOU鹅 会更新流程建议并提醒需要准备的动作。")} />
          <InfoPanel title="流程时间线" text={truncateText(`${stageLabel[candidate.currentStage]}｜${candidate.interviewHistory.join("｜") || "暂无面试记录"}`)} />
        </div>
        {role === "business" && candidate.pigeonScore >= 70 && (
          <div className="mt-5 rounded-[8px] border border-pigeon/40 bg-pigeon/10 p-4 text-sm font-bold text-pigeon">
            鸽值较高：面试中请重点确认候选人意愿、其他机会、到岗时间和稳定性。
          </div>
        )}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-black text-slate-900">操作日志</h3>
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            {candidate.logs.map((log) => <p key={log}>• {log}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameModal({ modal, onClose, onConfirm, onSelectMatch, onSelectReason }: { modal: AppModal; onClose: () => void; onConfirm: () => void; onSelectMatch: (index: number) => void; onSelectReason: (reason: string) => void }) {
  const selectedIndex = modal.selectedMatchIndex ?? 0;
  const selectedMatch = modal.matches?.[selectedIndex];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-5">
      <div className="quest-card max-h-[92vh] w-full max-w-5xl overflow-auto p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700">AI</div>
        <h2 className="mt-3 text-2xl font-black text-slate-900">{modal.type === "match" || modal.type === "reschedule" ? "一键约面改面 Agent" : modal.type === "phone" ? "AI 沟通记录" : "AI 任务面板"}</h2>
        <p className="mt-4 whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{modal.text}</p>
        {modal.type === "match" && modal.matches && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              {modal.matches.map((match, index) => (
                <button key={match.interviewerId} onClick={() => onSelectMatch(index)} className={`rounded-2xl border p-4 text-left transition ${selectedIndex === index ? "border-blue-400 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-blue-200"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-black text-slate-900">{match.interviewerName}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">{match.interviewerLevel}｜{match.interviewerRole}｜{match.businessDirection}</div>
                    </div>
                    <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-black text-white">{match.totalScore}</span>
                  </div>
                  <div className="mt-3 text-sm font-bold text-blue-700">推荐时间：{match.recommendedSlot}</div>
                  <div className="mt-3 space-y-1 text-xs leading-5 text-slate-600">
                    {match.reasons.slice(0, 3).map((reason) => <p key={reason}>• {reason}</p>)}
                  </div>
                </button>
              ))}
            </div>
            {selectedMatch && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-black text-slate-900">方案 {selectedIndex + 1} 分数拆解</h3>
                  <div className="text-sm font-black text-blue-700">总分 {selectedMatch.totalScore}/100</div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  {Object.entries(selectedMatch.scoreBreakdown).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-bold text-slate-500">{scoreLabel(key)}</div>
                      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div>
                    <div className="font-black text-slate-900">匹配原因</div>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">{selectedMatch.reasons.map((reason) => <p key={reason}>• {reason}</p>)}</div>
                  </div>
                  <div>
                    <div className="font-black text-slate-900">风险提示</div>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">{(selectedMatch.risks.length ? selectedMatch.risks : ["暂无明显风险，按推荐方案推进。"]).map((risk) => <p key={risk}>• {risk}</p>)}</div>
                  </div>
                  <div>
                    <div className="font-black text-slate-900">AI 面试问题建议</div>
                    <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">{selectedMatch.questions.map((question) => <p key={question}>{question}</p>)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {modal.type === "reschedule" && (
          <div className="mt-4 grid gap-2">
            {["时间冲突", "临时有事", "想换到更早时间", "想换到更晚时间", "其他"].map((reason) => (
              <button
                key={reason}
                className={`ghost-button text-left ${modal.reason === reason ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
                onClick={() => onSelectReason(reason)}
              >
                {reason}
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button className="ghost-button" onClick={onClose}>关闭</button>
          {modal.type === "match" && <button className="task-button" onClick={onConfirm}>确认安排</button>}
          {modal.type === "reschedule" && <button className="task-button" onClick={onConfirm}>确认改面</button>}
        </div>
      </div>
    </div>
  );
}

function scoreLabel(key: string) {
  const labels: Record<string, string> = {
    timeScore: "时间匹配",
    directionScore: "方向匹配",
    skillScore: "技能匹配",
    levelScore: "职级匹配",
    styleScore: "风格匹配",
    workloadScore: "面试负载",
    leaderRuleScore: "层级规则"
  };
  return labels[key] ?? key;
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="font-black text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}

function MetricGrid({ items }: { items: [string, string | number][] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {items.map(([label, value]) => (
        <div className="quest-card p-4" key={label}>
          <div className="text-xs font-black text-slate-500">{label}</div>
          <div className="mt-2 text-3xl font-black text-slate-900">{value}</div>
        </div>
      ))}
    </div>
  );
}

function Bar({ label, value, max, danger = false }: { label: string; value: number; max: number; danger?: boolean }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm font-bold text-slate-600"><span>{label}</span><span>{value}</span></div>
      <div className="h-3 rounded-full bg-slate-100">
        <div className={`h-3 rounded-full ${danger ? "bg-red-500" : "bg-blue-600"}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function matchScore(candidate: Candidate, interviewer: Interviewer, job?: Job) {
  const overlap = candidate.availableSlots.filter((slot) => interviewer.availableSlots.includes(slot)).length;
  const skillHits = interviewer.interviewSkills.filter((skill) => candidate.skills.includes(skill) || job?.requiredSkills.includes(skill)).length;
  const direction = interviewer.roleDirections.includes(candidate.appliedRole) ? 12 : 0;
  const executive = interviewer.isExecutive && (job?.urgency === "高" || candidate.gooseScore >= 85) ? 10 : 0;
  const urgency = candidate.gooseScore >= 85 && candidate.pigeonScore >= 70 ? 12 : candidate.gooseScore >= 85 ? 8 : candidate.pigeonScore >= 70 ? -8 : 4;
  const loadPenalty = interviewer.scheduledCount * 3;
  return Math.max(30, Math.min(99, 46 + overlap * 10 + skillHits * 9 + direction + executive + urgency - loadPenalty));
}
