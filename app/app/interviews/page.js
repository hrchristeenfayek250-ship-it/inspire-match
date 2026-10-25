
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";



const initialForm = {
  application_id: "",
  scheduled_at: "",
  type: "Technical Interview",
  interviewer: "",
  meeting_platform: "Google Meet",
  meeting_link: "",
  interview_location: "",
  interview_location_link: "",
};


const inputStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #d8e5de",
  borderRadius: 9,
  background: "#fff",
  color: "#183e32",
  boxSizing: "border-box",
};

export default function InterviewsPage() {
  const [form, setForm] = useState(initialForm);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);

  const [interviewEvaluations, setInterviewEvaluations] = useState([]);

  const [candidates, setCandidates] = useState({});
  const [jobs, setJobs] = useState({});
  const [companyId, setCompanyId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
const [updatingInterviewId, setUpdatingInterviewId] = useState(null);
const [reschedulingId, setReschedulingId] = useState(null);
const [newInterviewDate, setNewInterviewDate] = useState("");
  
  const [evaluatingInterviewId, setEvaluatingInterviewId] = useState(null);
  const [savingEvaluation, setSavingEvaluation] = useState(false);

 
  const [evaluationForm, setEvaluationForm] = useState({
    technical_skills: "",
    communication_skills: "",
    problem_solving: "",
    culture_fit: "",
    strengths: "",
    areas_for_improvement: "",
    overall_feedback: "",
    recommendation: "",
  });

  const [interviewDecisions, setInterviewDecisions] = useState([]);
  const [decidingInterviewId, setDecidingInterviewId] = useState(null);
  const [savingDecision, setSavingDecision] = useState(false);

  const [decisionForm, setDecisionForm] = useState({
    decision: "",
    decision_reason: "",
  });

const [movingApplicationId, setMovingApplicationId] = useState(null);
const [selectedPipelineStage, setSelectedPipelineStage] = useState("");
const [savingPipelineStage, setSavingPipelineStage] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  useEffect(() => {
    loadData();
  }, []);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        throw new Error("Please log in again.");
      }

      const uid = authData.user.id;
      setUserId(uid);

      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", uid)
          .limit(2);

      if (membershipError) throw membershipError;

      if (!memberships || memberships.length !== 1) {
        throw new Error(
          "Your account must belong to exactly one company."
        );
      }

      const cid = memberships[0].company_id;
      setCompanyId(cid);

     
     
      const [
        applicationsResult,
        interviewsResult,
        candidatesResult,
        jobsResult,
        evaluationsResult,
        decisionsResult,
      ] = await Promise.all([
        supabase
          .from("applications")
          .select("id, candidate_id, job_id, stage")
          .eq("company_id", cid),

        supabase
          .from("interviews")
          .select("*")
          .eq("company_id", cid)
          .order("scheduled_at", { ascending: true }),

        supabase
          .from("candidates")
          .select("id, full_name")
          .eq("company_id", cid),

        supabase
          .from("jobs")
          .select("id, title")
          .eq("company_id", cid),

        supabase
          .from("interview_evaluations")
          .select("*")
          .eq("company_id", cid),

        supabase
          .from("interview_decisions")
          .select("*")
          .eq("company_id", cid),
      ]);

     
      for (const result of [
        applicationsResult,
        interviewsResult,
        candidatesResult,
        jobsResult,
        evaluationsResult,
        decisionsResult,
      ]) {
        if (result.error) throw result.error;
      }

      setInterviewEvaluations(evaluationsResult.data || []);
      setInterviewDecisions(decisionsResult.data || []);


      setApplications(applicationsResult.data || []);
      setInterviews(interviewsResult.data || []);

      setCandidates(
        Object.fromEntries(
          (candidatesResult.data || []).map((item) => [
            item.id,
    
item.full_name,

          ])
        )
      );

      setJobs(
        Object.fromEntries(
          (jobsResult.data || []).map((item) => [
            item.id,
            item.title,
          ])
        )
      );
    } catch (err) {
      setError(err.message || "Unable to load interviews.");
    } finally {
      setLoading(false);
    }
  }

  async function scheduleInterview(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!companyId || !userId) {
      setError("Please reload the page and log in again.");
      return;
    }

    if (
      !form.application_id ||
      !form.scheduled_at ||
      !form.interviewer.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const selectedApplication = applications.find(
      (item) => String(item.id) === form.application_id
    );

    if (!selectedApplication) {
      setError("Please select a valid application.");
      return;
    }

    const date = new Date(form.scheduled_at);

    if (Number.isNaN(date.getTime())) {
      setError("Invalid interview date.");
      return;
    }

    if (date.getTime() <= Date.now()) {
      setError("Please choose a future interview date.");
      return;
    }

    setSaving(true);

    try {
     
      const { error: insertError } = await supabase
        .from("interviews")
        .insert({
          application_id: selectedApplication.id,
          company_id: companyId,
          user_id: userId,
          scheduled_at: date.toISOString(),
          type: form.type,
          interviewer: form.interviewer.trim(),
          meeting_platform: form.meeting_platform,
          meeting_link:
            form.meeting_platform === "In-Person"
              ? null
              : form.meeting_link.trim() || null,
          interview_location:
            form.meeting_platform === "In-Person"
              ? form.interview_location.trim() || null
              : null,
         
          interview_location_link:
            form.meeting_platform === "In-Person"
              ? form.interview_location_link.trim() || null
              : null,

          status: "scheduled",
        });


      if (insertError) throw insertError;

      setForm(initialForm);
      setSuccess("Interview scheduled successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to schedule interview.");
    } finally {
      setSaving(false);
    }
  }

  
  async function cancelInterview(interview) {
    if (!companyId || !userId || updatingInterviewId) return;

    if (interview.status === "cancelled") return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this interview?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setUpdatingInterviewId(interview.id);

    try {
      const { data, error: updateError } = await supabase
        .from("interviews")
        .update({ status: "cancelled" })
        .eq("id", interview.id)
        .eq("company_id", companyId)
        .eq("status", "scheduled")
        .select("id");

      if (updateError) throw updateError;

      if (!data || data.length !== 1) {
        throw new Error(
          "Interview could not be cancelled. Please refresh and try again."
        );
      }

      setSuccess("Interview cancelled successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to cancel interview.");
    } finally {
      setUpdatingInterviewId(null);
    }
  }

  async function updateInterviewStatus(interview, newStatus) {
    if (!companyId || !userId || updatingInterviewId) return;

    if (interview.status !== "scheduled") {
      setError("Only scheduled interviews can be updated.");
      return;
    }

    if (!["completed", "no_show"].includes(newStatus)) {
      setError("Invalid interview status.");
      return;
    }

    const confirmed = window.confirm(
      newStatus === "completed"
        ? "Mark this interview as completed?"
        : "Mark this candidate as No-show?"
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setUpdatingInterviewId(interview.id);

    try {
      const { data, error: updateError } = await supabase
        .from("interviews")
        .update({ status: newStatus })
        .eq("id", interview.id)
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .eq("status", "scheduled")
        .select("id");

      if (updateError) throw updateError;

      if (!data || data.length !== 1) {
        throw new Error(
          "Interview status could not be updated. Please refresh and try again."
        );
      }

      await loadData();

      setSuccess(
        newStatus === "completed"
          ? "Interview marked as completed successfully."
          : "Interview marked as No-show successfully."
      );
    } catch (err) {
      setError(err.message || "Failed to update interview status.");
    } finally {
      setUpdatingInterviewId(null);
    }
  }

  async function rescheduleInterview(interview) {
    if (!companyId || !userId || updatingInterviewId) return;

    if (interview.status !== "scheduled") {
      setError("Only scheduled interviews can be rescheduled.");
      return;
    }

    const date = new Date(newInterviewDate);

    if (
      !newInterviewDate ||
      Number.isNaN(date.getTime()) ||
      date.getTime() <= Date.now()
    ) {
      setError("Please choose a valid future interview date.");
      return;
    }

    setError("");
    setSuccess("");
    setUpdatingInterviewId(interview.id);

    try {
      const { data, error: updateError } = await supabase
        .from("interviews")
        .update({ scheduled_at: date.toISOString() })
        .eq("id", interview.id)
        .eq("company_id", companyId)
        .eq("status", "scheduled")
        .select("id");

      if (updateError) throw updateError;

      if (!data || data.length !== 1) {
        throw new Error(
          "Interview could not be rescheduled. Please refresh and try again."
        );
      }

      setSuccess("Interview rescheduled successfully.");
      setReschedulingId(null);
      setNewInterviewDate("");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to reschedule interview.");
    } finally {
      setUpdatingInterviewId(null);
    }
  }


  async function saveInterviewEvaluation(interview) {
    if (!companyId || !userId || savingEvaluation) return;

    const scoreFields = [
      "technical_skills",
      "communication_skills",
      "problem_solving",
      "culture_fit",
    ];

    const scores = {};

    for (const field of scoreFields) {
      const value = Number(evaluationForm[field]);

      if (
        evaluationForm[field] === "" ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > 5
      ) {
        setError("Please enter scores between 1 and 5.");
        return;
      }

      scores[field] = value;
    }

    if (!["Hire", "Hold", "Reject"].includes(evaluationForm.recommendation)) {
      setError("Please select a hiring recommendation.");
      return;
    }

    setSavingEvaluation(true);
    setError("");
    setSuccess("");

    try {
      const { error: saveError } = await supabase
        .from("interview_evaluations")
        .upsert(
          {
            interview_id: interview.id,
            company_id: companyId,
            evaluator_id: userId,
            ...scores,
            strengths: evaluationForm.strengths.trim(),
            areas_for_improvement:
              evaluationForm.areas_for_improvement.trim(),
            overall_feedback: evaluationForm.overall_feedback.trim(),
            recommendation: evaluationForm.recommendation,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "interview_id,evaluator_id",
          }
        );

      if (saveError) throw saveError;

      const { data: refreshedEvaluations, error: refreshError } =
        await supabase
          .from("interview_evaluations")
          .select("*")
          .eq("company_id", companyId);

      if (refreshError) throw refreshError;

      setInterviewEvaluations(refreshedEvaluations || []);

      setSuccess("Interview evaluation saved successfully.");
      setEvaluatingInterviewId(null);
    } catch (err) {
      setError(err.message || "Failed to save interview evaluation.");
    } finally {
      setSavingEvaluation(false);
    }
  }

  async function saveInterviewDecision(interview) {
    if (!companyId || !userId || savingDecision) return;

    if (interview.status !== "completed") {
      setError("Only completed interviews can have a final decision.");
      return;
    }

    if (!["Proceed", "Hold", "Reject"].includes(decisionForm.decision)) {
      setError("Please select a valid final decision.");
      return;
    }

    const reason = decisionForm.decision_reason.trim();

    if (!reason) {
      setError("Please enter the reason for your decision.");
      return;
    }

    setSavingDecision(true);
    setError("");
    setSuccess("");

    try {
      const existingDecision = interviewDecisions.find(
        (item) => item.interview_id === interview.id
      );

      const payload = {
        decision: decisionForm.decision,
        decision_reason: reason,
        updated_at: new Date().toISOString(),
      };

      let saveError;

      if (existingDecision) {
        const result = await supabase
          .from("interview_decisions")
          .update(payload)
          .eq("id", existingDecision.id)
          .eq("company_id", companyId)
          .eq("decided_by", userId)
          .select("id")
          .single();

        saveError = result.error;
      } else {
        const result = await supabase
          .from("interview_decisions")
          .insert({
            interview_id: interview.id,
            company_id: companyId,
            decided_by: userId,
            ...payload,
          })
          .select("id")
          .single();

        saveError = result.error;
      }

      if (saveError) throw saveError;

      const { data, error: refreshError } = await supabase
        .from("interview_decisions")
        .select("*")
        .eq("company_id", companyId);

      if (refreshError) throw refreshError;

      setInterviewDecisions(data || []);
      setDecidingInterviewId(null);
      setSuccess("Final hiring decision saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save final hiring decision.");
    } finally {
      setSavingDecision(false);
    }
  }

async function moveInterviewToPipeline(interview) {
  if (!companyId || !userId || savingPipelineStage) return;

  setError("");
  setSuccess("");

  try {
    if (interview.status !== "completed") {
      throw new Error("Only completed interviews can be moved.");
    }

    const savedDecision = interviewDecisions.find(
      (item) => item.interview_id === interview.id
    );

    if (!savedDecision || savedDecision.decision === "Hold") {
      throw new Error("A Proceed or Reject decision is required.");
    }

    const targetStage =
      savedDecision.decision === "Reject"
        ? "Rejected"
        : selectedPipelineStage;

    const allowedStages = [
      "Screening",
      "Interview",
      "Shortlisted",
    ];

    if (
      savedDecision.decision === "Proceed" &&
      !allowedStages.includes(targetStage)
    ) {
      throw new Error("Please select a valid pipeline stage.");
    }

    const application = applications.find(
      (item) =>
        String(item.id) === String(interview.application_id)
    );

    if (!application) {
      throw new Error("Application not found.");
    }

    if (application.stage === targetStage) {
      throw new Error("Candidate is already in this stage.");
    }

    const confirmed = window.confirm(
      `Move candidate from ${application.stage || "Unassigned"} to ${targetStage}?`
    );

    if (!confirmed) return;

    setSavingPipelineStage(true);

    const { data, error: updateError } = await supabase
      .from("applications")
      .update({ stage: targetStage })
      .eq("id", application.id)
      .eq("company_id", companyId)
      .select("id, stage")
      .single();

    if (updateError) throw updateError;

    setApplications((previous) =>
      previous.map((item) =>
        item.id === data.id
          ? { ...item, stage: data.stage }
          : item
      )
    );

    setMovingApplicationId(null);
    setSelectedPipelineStage("");

    setSuccess(
      `Candidate moved to ${targetStage} successfully.`
    );
  } catch (err) {
    setError(err.message || "Failed to update pipeline.");
  } finally {
    setSavingPipelineStage(false);
  }
}

  function applicationLabel(application) {
    const candidate =
      candidates[application.candidate_id] ||
      `Candidate #${application.candidate_id}`;

    const job =
      jobs[application.job_id] ||
      `Job #${application.job_id}`;

    return `${candidate} — ${job}`;
  }


  
  const interviewAnalytics = {
    total: interviews.length,

    completed: interviews.filter(
      (item) => item.status === "completed"
    ).length,

    scheduled: interviews.filter(
      (item) => item.status === "scheduled"
    ).length,

    cancelled: interviews.filter(
      (item) => item.status === "cancelled"
    ).length,

    noShow: interviews.filter(
      (item) => item.status === "no_show"
    ).length,

    proceed: interviewDecisions.filter(
      (item) => item.decision === "Proceed"
    ).length,

    hold: interviewDecisions.filter(
      (item) => item.decision === "Hold"
    ).length,

    rejected: interviewDecisions.filter(
      (item) => item.decision === "Reject"
    ).length,
  };

  interviewAnalytics.completionRate =
    interviewAnalytics.total > 0
      ? Math.round(
          (interviewAnalytics.completed /
            interviewAnalytics.total) *
            100
        )
      : 0;

  const interviewerPerformance = Object.values(
    interviewEvaluations.reduce((acc, evaluation) => {
      const evaluatorId = evaluation.evaluator_id;

      if (!evaluatorId) return acc;

      if (!acc[evaluatorId]) {
        acc[evaluatorId] = {
          evaluatorId,
          totalEvaluations: 0,
          totalScore: 0,
          scoredEvaluations: 0,
          recommendations: {
            hire: 0,
            hold: 0,
            reject: 0,
          },
        };
      }

      const record = acc[evaluatorId];
      record.totalEvaluations += 1;

      const scores = [
        evaluation.technical_skills,
        evaluation.communication_skills,
        evaluation.problem_solving,
        evaluation.culture_fit,
      ].map(Number);

      if (
        scores.every(
          (score) =>
            Number.isFinite(score) &&
            score >= 1 &&
            score <= 5
        )
      ) {
        record.totalScore +=
          scores.reduce((sum, score) => sum + score, 0) /
          scores.length;

        record.scoredEvaluations += 1;
      }

      const recommendation = String(
        evaluation.recommendation || ""
      ).toLowerCase();

      if (recommendation in record.recommendations) {
        record.recommendations[recommendation] += 1;
      }

      return acc;
    }, {})
  ).map((record) => ({
    ...record,
    averageScore:
      record.scoredEvaluations > 0
        ? (
            record.totalScore / record.scoredEvaluations
          ).toFixed(2)
        : "N/A",
  }));

  const scorecardIntelligence = [
    ["Technical Skills", "technical_skills"],
    ["Communication", "communication_skills"],
    ["Problem Solving", "problem_solving"],
    ["Culture Fit", "culture_fit"],
  ].map(([label, field]) => {
    const scores = interviewEvaluations
      .map((evaluation) => evaluation[field])
      .filter(
        (value) => value !== null &&
          value !== undefined &&
          value !== ""
      )
      .map(Number)
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value >= 1 &&
          value <= 5
      );

    const average = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) /
        scores.length
      : null;

    return {
      label,
      count: scores.length,
      average,
      percentage:
        average === null ? 0 : (average / 5) * 100,
    };
  });

  const validSkillInsights = scorecardIntelligence.filter(
    (skill) => skill.average !== null
  );

  const sortedSkillInsights = [...validSkillInsights].sort(
    (a, b) => b.average - a.average
  );

  const strongestSkill =
    sortedSkillInsights.length > 0
      ? sortedSkillInsights[0]
      : null;

  const improvementSkill =
    sortedSkillInsights.length > 1
      ? sortedSkillInsights[sortedSkillInsights.length - 1]
      : null;

  const skillScoreGap =
    strongestSkill && improvementSkill
      ? strongestSkill.average - improvementSkill.average
      : null;

  const interviewerAlignment = Object.values(
    interviewEvaluations.reduce((groups, evaluation) => {
      const interviewId = evaluation.interview_id;
      const evaluatorId = evaluation.evaluator_id;

      if (!interviewId || !evaluatorId) return groups;

      const fields = [
        "technical_skills",
        "communication_skills",
        "problem_solving",
        "culture_fit",
      ];

      const scores = fields.map((field) =>
        Number(evaluation[field])
      );

      const valid = fields.every(
        (field, index) =>
          evaluation[field] !== null &&
          evaluation[field] !== undefined &&
          evaluation[field] !== "" &&
          Number.isFinite(scores[index]) &&
          scores[index] >= 1 &&
          scores[index] <= 5
      );

      if (!valid) return groups;

      if (!groups[interviewId]) {
        groups[interviewId] = {
          interviewId,
          evaluators: new Map(),
        };
      }

      groups[interviewId].evaluators.set(
        evaluatorId,
        scores.reduce((sum, score) => sum + score, 0) /
          scores.length
      );

      return groups;
    }, {})
  )
    .map((group) => {
      const scores = [...group.evaluators.values()];

      if (scores.length < 2) return null;

      const scoreGap =
        Math.max(...scores) - Math.min(...scores);

      return {
        interviewId: group.interviewId,
        evaluatorCount: scores.length,
        scoreGap,
        alignment:
          scoreGap <= 0.5
            ? "High"
            : scoreGap <= 1
              ? "Moderate"
              : "Low",
      };
    })
    .filter(Boolean);

  const alignmentSummary = {
    total: interviewerAlignment.length,
    high: interviewerAlignment.filter(
      (item) => item.alignment === "High"
    ).length,
    moderate: interviewerAlignment.filter(
      (item) => item.alignment === "Moderate"
    ).length,
    low: interviewerAlignment.filter(
      (item) => item.alignment === "Low"
    ).length,
  };

  const completedInterviewApplications = new Set(
    interviews
      .filter(
        (interview) =>
          interview.status === "completed" &&
          interview.application_id
      )
      .map((interview) => interview.application_id)
  );

  const interviewedApplications = applications.filter(
    (application) =>
      completedInterviewApplications.has(application.id)
  );

  const hiredAfterInterview = interviewedApplications.filter(
    (application) =>
      String(application.stage || "").toLowerCase() === "hired"
  );

  const interviewToHireReport = {
    interviewedCandidates: interviewedApplications.length,
    hiredCandidates: hiredAfterInterview.length,
    conversionRate:
      interviewedApplications.length > 0
        ? (
            (hiredAfterInterview.length /
              interviewedApplications.length) *
            100
          ).toFixed(1)
        : null,
  };

  const schedulingEfficiency = (() => {
    const total = interviews.length;

    const completed = interviews.filter(
      (item) => item.status === "completed"
    ).length;

    const cancelled = interviews.filter(
      (item) => item.status === "cancelled"
    ).length;

    const noShow = interviews.filter(
      (item) => item.status === "no_show"
    ).length;

    const scheduled = interviews.filter(
      (item) => item.status === "scheduled"
    ).length;

    const concluded = completed + cancelled + noShow;

    const percentage = (count, denominator) =>
      denominator > 0
        ? ((count / denominator) * 100).toFixed(1)
        : null;

    return {
      total,
      completed,
      cancelled,
      noShow,
      scheduled,
      concluded,
      completionRate: percentage(completed, concluded),
      cancellationRate: percentage(cancelled, concluded),
      noShowRate: percentage(noShow, concluded),
      scheduledRate: percentage(scheduled, total),
    };
  })();

  return (
    <div className="interviews-shell">
      <style>{`
        .interviews-shell {
          display: grid;
          grid-template-columns: 245px minmax(0, 1fr);
          min-height: 100vh;
          background: #f6f9f7;
          color: #183e32;
          font-family: Arial, sans-serif;
        }

        .interviews-sidebar {
          background: #ffffff;
          border-right: 1px solid #e3ebe6;
          padding: 26px 16px;
        }

        .interviews-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 35px;
          padding: 0 10px;
        }

        .interviews-logo {
          background: #315f50;
          color: white;
          border-radius: 12px;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 23px;
        }

        .interviews-brand strong {
          display: block;
          font-size: 17px;
        }

        .interviews-brand small {
          color: #82948a;
          font-size: 10px;
          letter-spacing: 1px;
        }

        .interviews-navigation {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .interviews-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 14px;
          border-radius: 10px;
          text-decoration: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .interviews-nav-item:hover,
        .interviews-nav-item.active {
          background: #e8f2ec;
          color: #315f50;
        }

       

.interviews-shell > main.interviews-content {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: none;
  margin: 0;
  padding: 28px 32px 48px;
  box-sizing: border-box;
  background: #f6f9f7;
}

}

.interviews-content > section {
  width: 100%;
  max-width: none;
  box-sizing: border-box;
  box-shadow: 0 8px 28px rgba(25, 70, 50, 0.045);
}

.interviews-content > section form {
  width: 100%;
}

.interviews-content > section form > div {
  display: grid !important;
  grid-template-columns:
    repeat(2, minmax(0, 1fr)) !important;
  gap: 20px !important;
}

.interviews-content label {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: #345548;
}

.interviews-content input,
.interviews-content select {
  width: 100%;
  min-height: 46px;
  font-size: 14px;
}

.interviews-content h1 {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: #214c3c;
}

.interviews-content h2 {
  font-size: 19px;
  font-weight: 750;
  color: #214c3c;
  margin: 0 0 24px;
}

@media (max-width: 700px) {
  .interviews-content {
    padding: 20px 16px;
  }

  .interviews-content > section form > div {
    grid-template-columns: 1fr !important;
  }
}

        @media (max-width: 850px) {
          .interviews-shell {
            grid-template-columns: 1fr;
          }

          .interviews-sidebar {
            border-right: 0;
            border-bottom: 1px solid #e3ebe6;
          }

          .interviews-navigation {
            flex-direction: row;
            flex-wrap: wrap;
          }

          .interviews-content {
            padding: 20px;
          }
        }
      `}</style>

      <aside className="interviews-sidebar">
        <div className="interviews-brand">
          <div className="interviews-logo">I</div>
          <div>
            <strong>Inspire Match</strong>
            <small>TALENT INTELLIGENCE</small>
          </div>
        </div>

        <ATSNavigation
          className="interviews-navigation"
          linkClassName="interviews-nav-item"
        />
      </aside>

      <main className="interviews-content">

        <Link
          href="/app/dashboard"
          style={{ color: "#315f50" }}
        >
          ← Dashboard
        </Link>

        <h1 style={{ marginBottom: 8 }}>
          Interview Management
        </h1>

        <p style={{ color: "#64748b", marginBottom: 26 }}>
          Schedule interviews and manage your recruitment
          process.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: 14,
              background: "#fff0f0",
              color: "#a52a2a",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              padding: 14,
              background: "#e6f4eb",
              color: "#216b45",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {success}
          </div>
        )}

<section
  style={{
    background: "#ffffff",
    padding: 26,
    borderRadius: 16,
    border: "1px solid #e0e9e3",
    marginBottom: 25,
  }}
>
  <div style={{ marginBottom: 22 }}>
    <h2 style={{ margin: 0, color: "#183e32" }}>
      Interview Analytics
    </h2>
    <p style={{ color: "#64748b", marginTop: 8 }}>
      Real-time interview performance and hiring insights.
    </p>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(170px, 1fr))",
      gap: 16,
    }}
  >
    {[
      ["Total Interviews", interviewAnalytics.total],
      ["Completed", interviewAnalytics.completed],
      ["Scheduled", interviewAnalytics.scheduled],
      ["Cancelled", interviewAnalytics.cancelled],
      ["No Shows", interviewAnalytics.noShow],
      ["Completion Rate", `${interviewAnalytics.completionRate}%`],
      ["Proceed Decisions", interviewAnalytics.proceed],
      ["Hold Decisions", interviewAnalytics.hold],
      ["Reject Decisions", interviewAnalytics.rejected],
    ].map(([label, value]) => (
      <div
        key={label}
        style={{
          padding: 20,
          borderRadius: 14,
          background: "#f6f9f7",
          border: "1px solid #e0e9e3",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          {label}
        </p>

        <div
          style={{
            marginTop: 12,
            fontSize: 29,
            fontWeight: 800,
            color: "#315f50",
          }}
        >
          {value}
        </div>
      </div>
    ))}
  </div>

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
    gap: 20,
    marginTop: 26,
  }}
>
  {[
    {
      title: "Interview Status Distribution",
      items: [
        ["Completed", interviewAnalytics.completed],
        ["Scheduled", interviewAnalytics.scheduled],
        ["Cancelled", interviewAnalytics.cancelled],
        ["No Shows", interviewAnalytics.noShow],
      ],
    },
    {
      title: "Final Hiring Decisions",
      items: [
        ["Proceed", interviewAnalytics.proceed],
        ["Hold", interviewAnalytics.hold],
        ["Reject", interviewAnalytics.rejected],
      ],
    },
  ].map((chart) => {
    const total = chart.items.reduce(
      (sum, [, value]) => sum + value,
      0
    );

    return (
      <div
        key={chart.title}
        style={{
          padding: 22,
          border: "1px solid #e0e9e3",
          borderRadius: 14,
          background: "#ffffff",
        }}
      >
        <h3 style={{ color: "#183e32", marginTop: 0 }}>
          {chart.title}
        </h3>

        {total === 0 ? (
          <p style={{ color: "#64748b" }}>
            No data available yet.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {chart.items.map(([label, value]) => {
              const percentage = Math.round(
                (value / total) * 100
              );

              return (
                <div key={label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 8,
                      fontSize: 13,
                    }}
                  >
                    <strong>{label}</strong>
                    <span>
                      {value} ({percentage}%)
                    </span>
                  </div>

                  <div
                    style={{
                      height: 12,
                      background: "#e8f2ec",
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${percentage}%`,
                        background: "#315f50",
                        borderRadius: 20,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  })}
</div>

      </section>

<section
  style={{
    background: "#ffffff",
    padding: 26,
    borderRadius: 16,
    border: "1px solid #e0e9e3",
    marginBottom: 25,
  }}
>
  <h2 style={{ color: "#183e32", marginTop: 0 }}>
    Interviewer Performance Analytics
  </h2>

  <p style={{ color: "#64748b", marginBottom: 24 }}>
    Evaluation activity, candidate scoring, and hiring
    recommendations by interviewer.
  </p>

  {interviewerPerformance.length === 0 ? (
    <p style={{ color: "#64748b" }}>
      No interviewer evaluations available yet.
    </p>
  ) : (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: "#e8f2ec" }}>
            {[
              "Interviewer",
              "Evaluations",
              "Avg. Candidate Score",
              "Hire",
              "Hold",
              "Reject",
            ].map((heading) => (
              <th
                key={heading}
                style={{
                  padding: 14,
                  color: "#315f50",
                  whiteSpace: "nowrap",
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {interviewerPerformance.map((item) => (
            <tr
              key={item.evaluatorId}
              style={{
                borderBottom: "1px solid #e0e9e3",
              }}
            >
              <td style={{ padding: 14 }}>
                {item.evaluatorId === userId
                  ? "You"
                  : `Interviewer ${item.evaluatorId.slice(0, 8)}`}
              </td>

              <td style={{ padding: 14 }}>
                {item.totalEvaluations}
              </td>

              <td style={{ padding: 14, fontWeight: 700 }}>
                {item.averageScore === "N/A"
                  ? "N/A"
                  : `${item.averageScore} / 5`}
              </td>

              <td style={{ padding: 14 }}>
                {item.recommendations.hire}
              </td>

              <td style={{ padding: 14 }}>
                {item.recommendations.hold}
              </td>

              <td style={{ padding: 14 }}>
                {item.recommendations.reject}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</section>

<section
  style={{
    background: "#ffffff",
    padding: 26,
    borderRadius: 16,
    border: "1px solid #e0e9e3",
    marginBottom: 25,
  }}
>
  <h2 style={{ color: "#183e32", marginTop: 0 }}>
    Interview Scorecard Intelligence
  </h2>

  <p style={{ color: "#64748b", marginBottom: 24 }}>
    Average candidate scores across four evaluation dimensions.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
      gap: 18,
    }}
  >
    {scorecardIntelligence.map((skill) => (
      <div
        key={skill.label}
        style={{
          padding: 20,
          background: "#f6f9f7",
          border: "1px solid #e0e9e3",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <strong style={{ color: "#183e32" }}>
            {skill.label}
          </strong>

          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#315f50",
            }}
          >
            {skill.average === null
              ? "N/A"
              : `${skill.average.toFixed(2)} / 5`}
          </span>
        </div>

        <div
          style={{
            marginTop: 16,
            height: 12,
            background: "#e0e9e3",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${skill.percentage}%`,
              height: "100%",
              background: "#315f50",
              borderRadius: 20,
            }}
          />
        </div>

        <p
          style={{
            marginBottom: 0,
            fontSize: 12,
            color: "#64748b",
          }}
        >
          Based on {skill.count} valid evaluations
        </p>
      </div>
    ))}
  </div>

<div
  style={{
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
    gap: 16,
    marginTop: 24,
  }}
>
  {[
    {
      title: "Highest-Rated Skill",
      skill: strongestSkill,
      description: "Highest average candidate evaluation",
    },
    {
      title: "Lowest-Rated Skill",
      skill: improvementSkill,
      description: "Lowest average candidate evaluation",
    },
  ].map((insight) => (
    <div
      key={insight.title}
      style={{
        padding: 22,
        background: "#f6f9f7",
        border: "1px solid #e0e9e3",
        borderRadius: 14,
      }}
    >
      <p style={{ color: "#64748b", marginTop: 0 }}>
        {insight.title}
      </p>

      <h3 style={{ color: "#315f50", marginBottom: 8 }}>
        {insight.skill?.label || "Not enough data"}
      </h3>

      <strong style={{ fontSize: 24, color: "#183e32" }}>
        {insight.skill
          ? `${insight.skill.average.toFixed(2)} / 5`
          : "N/A"}
      </strong>

      <p style={{ fontSize: 12, color: "#64748b" }}>
        {insight.description}
      </p>

      {insight.skill && (
        <p style={{ fontSize: 12, color: "#64748b" }}>
          Based on {insight.skill.count} evaluations
        </p>
      )}
    </div>
  ))}

  <div
    style={{
      padding: 22,
      background: "#e8f2ec",
      border: "1px solid #d5e5da",
      borderRadius: 14,
    }}
  >
    <p style={{ color: "#64748b", marginTop: 0 }}>
      Skill Score Gap
    </p>

    <h3 style={{ color: "#315f50", fontSize: 26 }}>
      {skillScoreGap === null
        ? "N/A"
        : `${skillScoreGap.toFixed(2)} pts`}
    </h3>

    <p style={{ fontSize: 12, color: "#64748b" }}>
      Difference between highest and lowest average
      candidate skill scores.
    </p>
  </div>
</div>

      </section>

<section
  style={{
    background: "#ffffff",
    padding: 26,
    borderRadius: 16,
    border: "1px solid #e0e9e3",
    marginBottom: 25,
  }}
>
  <h2 style={{ color: "#183e32", marginTop: 0 }}>
    Interviewer Alignment Analytics
  </h2>

  <p style={{ color: "#64748b", marginBottom: 24 }}>
    Compare scoring consistency between different interviewers
    evaluating the same interview.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
      gap: 16,
    }}
  >
    {[
      {
        label: "Multi-Evaluator Interviews",
        value: alignmentSummary.total,
      },
      {
        label: "High Alignment",
        value: alignmentSummary.high,
      },
      {
        label: "Moderate Alignment",
        value: alignmentSummary.moderate,
      },
      {
        label: "Low Alignment",
        value: alignmentSummary.low,
      },
    ].map((item) => (
      <div
        key={item.label}
        style={{
          padding: 20,
          borderRadius: 14,
          background: "#f6f9f7",
          border: "1px solid #e0e9e3",
        }}
      >
        <p
          style={{
            marginTop: 0,
            color: "#64748b",
            fontSize: 13,
          }}
        >
          {item.label}
        </p>

        <strong
          style={{
            fontSize: 30,
            color: "#315f50",
          }}
        >
          {item.value}
        </strong>
      </div>
    ))}
  </div>

  {interviewerAlignment.length === 0 ? (
    <p
      style={{
        marginTop: 22,
        color: "#64748b",
      }}
    >
      No interviews with two or more valid evaluator scorecards yet.
    </p>
  ) : (
    <div style={{ overflowX: "auto", marginTop: 24 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
        }}
      >
        <thead>
          <tr>
            {[
              "Interview",
              "Evaluators",
              "Score Gap",
              "Alignment",
            ].map((heading) => (
              <th
                key={heading}
                style={{
                  padding: 14,
                  borderBottom: "1px solid #e0e9e3",
                  color: "#315f50",
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {interviewerAlignment.map((item) => (
            <tr key={item.interviewId}>
              <td style={{ padding: 14 }}>
                {item.interviewId.slice(0, 8)}
              </td>

              <td style={{ padding: 14 }}>
                {item.evaluatorCount}
              </td>

              <td style={{ padding: 14 }}>
                {item.scoreGap.toFixed(2)} / 5
              </td>

              <td style={{ padding: 14 }}>
                <strong
                  style={{
                    color:
                      item.alignment === "High"
                        ? "#26734d"
                        : item.alignment === "Moderate"
                          ? "#a06a17"
                          : "#b54747",
                  }}
                >
                  {item.alignment}
                </strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}

  <p
    style={{
      marginTop: 18,
      marginBottom: 0,
      color: "#64748b",
      fontSize: 12,
    }}
  >
    Alignment is based on the difference between the highest
    and lowest evaluator average scores. High: 0–0.5,
    Moderate: above 0.5–1, Low: above 1 point.
  </p>
</section>

<section
  style={{
    background: "#ffffff",
    padding: 26,
    borderRadius: 16,
    border: "1px solid #e0e9e3",
    marginBottom: 25,
  }}
>
  <h2 style={{ color: "#183e32", marginTop: 0 }}>
    Interview-to-Hire Conversion Report
  </h2>

  <p style={{ color: "#64748b", marginBottom: 24 }}>
    Track how many job applications with completed interviews
    have reached the Hired stage.
  </p>

  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
      gap: 16,
    }}
  >
    {[
      {
        label: "Interviewed Applications",
        value: interviewToHireReport.interviewedCandidates,
      },
      {
        label: "Hired Applications",
        value: interviewToHireReport.hiredCandidates,
      },
      {
        label: "Interview-to-Hire Rate",
        value:
          interviewToHireReport.conversionRate === null
            ? "N/A"
            : `${interviewToHireReport.conversionRate}%`,
      },
    ].map((item) => (
      <div
        key={item.label}
        style={{
          padding: 22,
          borderRadius: 14,
          background: "#f6f9f7",
          border: "1px solid #e0e9e3",
        }}
      >
        <p
          style={{
            marginTop: 0,
            fontSize: 13,
            color: "#64748b",
          }}
        >
          {item.label}
        </p>

        <strong
          style={{
            fontSize: 30,
            color: "#315f50",
          }}
        >
          {item.value}
        </strong>
      </div>
    ))}
  </div>

  <div
    style={{
      marginTop: 24,
      background: "#e0e9e3",
      height: 14,
      borderRadius: 20,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        width: `${
          interviewToHireReport.conversionRate === null
            ? 0
            : interviewToHireReport.conversionRate
        }%`,
        height: "100%",
        background: "#315f50",
        borderRadius: 20,
      }}
    />
  </div>

  <p
    style={{
      marginTop: 14,
      marginBottom: 0,
      fontSize: 12,
      color: "#64748b",
    }}
  >
    Each job application is counted once. This report
    uses the current pipeline stage, not historical hiring
    events.
  </p>
</section>

        <section
          style={{
            background: "#fff",
            padding: 26,
            borderRadius: 16,
            border: "1px solid #e0e9e3",
            marginBottom: 25,
          }}
        >
          <h2>Schedule New Interview</h2>

          <form onSubmit={scheduleInterview}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 18,
              }}
            >
              <label>
                Candidate / Job Application
                <select
                  required
                  style={inputStyle}
                  value={form.application_id}
                  onChange={(e) =>
                    updateField(
                      "application_id",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select application
                  </option>
                  {applications.map((application) => (
                    <option
                      key={application.id}
                      value={application.id}
                    >
                      {applicationLabel(application)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Interview Date & Time
                <input
                  required
                  type="datetime-local"
                  style={inputStyle}
                  value={form.scheduled_at}
                  onChange={(e) =>
                    updateField(
                      "scheduled_at",
                      e.target.value
                    )
                  }
                />
              </label>

              <label>
                Hiring Manager / Interviewer
                <input
                  required
                  style={inputStyle}
                  value={form.interviewer}
                  onChange={(e) =>
                    updateField(
                      "interviewer",
                      e.target.value
                    )
                  }
                  placeholder="Interviewer name"
                />
              </label>

              <label>
                Interview Type
                <select
                  style={inputStyle}
                  value={form.type}
                  onChange={(e) =>
                    updateField("type", e.target.value)
                  }
                >
                  <option>HR Interview</option>
                  <option>Technical Interview</option>
                  <option>Manager Interview</option>
                  <option>Final Interview</option>
                </select>
              </label>
           
<label>
  Meeting Platform
  <select
    style={inputStyle}
    value={form.meeting_platform}
    onChange={(e) => {
      updateField("meeting_platform", e.target.value);
    }}
  >
    <option value="Google Meet">Google Meet</option>
    <option value="Microsoft Teams">Microsoft Teams</option>
    <option value="Zoom">Zoom</option>
    <option value="Webex">Webex</option>
    
          
    <option value="Other Platform">Other Platform</option>
    <option value="In-Person">In-Person</option>
  </select>
</label>

{form.meeting_platform === "In-Person" ? (
  <>
    <label>
      Interview Location *
      <input
        style={inputStyle}
        type="text"
        value={form.interview_location}
        onChange={(e) =>
          updateField("interview_location", e.target.value)
        }
        placeholder="Office address"
        required
      />
    </label>

    <label>
      Location Link (Optional)
      <input
        style={inputStyle}
        type="url"
        value={form.interview_location_link}
        onChange={(e) =>
          updateField("interview_location_link", e.target.value)
        }
        placeholder="https://maps.google.com/..."
      />
    </label>
  </>
) : (
  <label>
    Meeting Link *
    <input
      style={inputStyle}
      type="url"
      value={form.meeting_link}
      onChange={(e) =>
        updateField("meeting_link", e.target.value)
      }
      placeholder="https://..."
      required
    />
  </label>
)}

<button
  type="submit"
  disabled={saving || loading || !applications.length}
  style={{
    marginTop: 24,
    padding: "13px 24px",
    background: "#315f50",
    color: "#fff",
    border: 0,
    borderRadius: 10,
    fontWeight: 700,
    cursor: "pointer",
    opacity: saving || loading || !applications.length ? 0.55 : 1,
  }}
>
  {saving ? "Saving..." : "Schedule Interview"}
</button>

            </div>
            {!loading && !applications.length && (
              <p style={{ color: "#64748b" }}>
                No applications available for scheduling.
              </p>
            )}
          </form>
        </section>

        <section
          style={{
            background: "#fff",
            padding: 26,
            borderRadius: 16,
            border: "1px solid #e0e9e3",
          }}
        >
          <h2>Scheduled Interviews</h2>

          {loading ? (
            <p>Loading interviews...</p>
          ) : interviews.length === 0 ? (
            <p style={{ color: "#64748b" }}>
              No interviews scheduled yet.
            </p>
          ) : (
            
                   

            <div style={{ display: "grid", gap: 12 }}>
              {interviews.map((interview) => {
                const application = applications.find(
                  (item) =>
                    item.id === interview.application_id
                );

                return (
                  <div
                    key={interview.id}
                    style={{
                      padding: 18,
                      border: "1px solid #e2e8e5",
                      borderRadius: 12,
                    }}
                  >
                    <strong>
                      {application
                        ? applicationLabel(application)
                        : `Application #${interview.application_id}`}
                    </strong>

                    <p style={{ color: "#64748b" }}>
                      {interview.type} —{" "}
                      {interview.interviewer}
                    </p>

                    <p>
                      {new Date(
                        interview.scheduled_at
                      ).toLocaleString()}
                    </p>

                   
                    <span
                      style={{
                        display: "inline-block",
                        background: "#e7f3eb",
                        padding: "6px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                      }}
                    >
                      {interview.status}
                    </span>

                   
                    {interview.status === "scheduled" && (
                      <div style={{ marginTop: 16 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setReschedulingId(interview.id);
                              setNewInterviewDate("");
                            }}
                            disabled={updatingInterviewId !== null}
                            style={{
                              padding: "10px 16px",
                              background: "#315f50",
                              color: "#fff",
                              border: 0,
                              borderRadius: 9,
                              cursor: "pointer",
                            }}
                          >
                            Reschedule
                          </button>

                          <button
                            type="button"
                            onClick={() => cancelInterview(interview)}
                            disabled={updatingInterviewId !== null}
                            style={{
                              padding: "10px 16px",
                              background: "#fff",
                              color: "#b42318",
                              border: "1px solid #f1c4c0",
                              borderRadius: 9,
                              cursor: "pointer",
                            }}
                          >
                            {updatingInterviewId === interview.id
                              ? "Updating..."
                              : "Cancel Interview"}
                          </button>
                   
                          <button
                            type="button"
                            onClick={() =>
                              updateInterviewStatus(interview, "completed")
                            }
                            disabled={updatingInterviewId !== null}
                            style={{
                              padding: "10px 16px",
                              background: "#e7f3eb",
                              color: "#17643d",
                              border: "1px solid #b8dcc7",
                              borderRadius: 9,
                              cursor: "pointer",
                            }}
                          >
                            Mark Completed
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateInterviewStatus(interview, "no_show")
                            }
                            disabled={updatingInterviewId !== null}
                            style={{
                              padding: "10px 16px",
                              background: "#fff",
                              color: "#92400e",
                              border: "1px solid #f1d5a5",
                              borderRadius: 9,
                              cursor: "pointer",
                            }}
                          >
                            No-show
                          </button>
     
                            
                    </div>

                        {reschedulingId === interview.id && (
                          <div style={{ marginTop: 14 }}>
                            <input
                              type="datetime-local"
                              style={inputStyle}
                              value={newInterviewDate}
                              onChange={(e) =>
                                setNewInterviewDate(e.target.value)
                              }
                            />

                            <button
                              type="button"
                              onClick={() => rescheduleInterview(interview)}
                              disabled={updatingInterviewId !== null}
                              style={{
                                marginTop: 10,
                                padding: "10px 16px",
                                background: "#315f50",
                                color: "#fff",
                                border: 0,
                                borderRadius: 9,
                                cursor: "pointer",
                              }}
                            >
                              Save New Date
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {(() => {
                      const evaluations = interviewEvaluations.filter(
                        (item) => item.interview_id === interview.id
                      );

                      if (!evaluations.length) return null;

                      const scoreFields = [
                        "technical_skills",
                        "communication_skills",
                        "problem_solving",
                        "culture_fit",
                      ];

                      const scores = evaluations.flatMap((evaluation) =>
                        scoreFields
                          .map((field) => evaluation[field])
                          .filter(
                            (value) =>
                              typeof value === "number" &&
                              Number.isFinite(value)
                          )
                      );

                      const combinedScore = scores.length
                        ? (
                            scores.reduce((sum, value) => sum + value, 0) /
                            scores.length
                          ).toFixed(2)
                        : "N/A";

                      const hireCount = evaluations.filter(
                        (item) => item.recommendation === "Hire"
                      ).length;

                      const holdCount = evaluations.filter(
                        (item) => item.recommendation === "Hold"
                      ).length;

                      const rejectCount = evaluations.filter(
                        (item) => item.recommendation === "Reject"
                      ).length;

                      return (
                        <div
                          style={{
                            marginTop: 16,
                            padding: 16,
                            border: "1px solid #c9ded3",
                            borderRadius: 10,
                          }}
                        >
                          <strong>Combined Interview Scorecard</strong>

                          <p>
                            Overall Team Score: {combinedScore} / 5
                          </p>

                          <p>
                            Total Evaluations: {evaluations.length}
                          </p>

                          <p>
                            Hire: {hireCount} | Hold: {holdCount} |
                            Reject: {rejectCount}
                          </p>
                        </div>
                      );
                    })()}

                    {interviewEvaluations
                      .filter(
                        (item) => item.interview_id === interview.id
                      )
                      .map((evaluation) => {
                        const scores = [
                          evaluation.technical_skills,
                          evaluation.communication_skills,
                          evaluation.problem_solving,
                          evaluation.culture_fit,
                        ].filter(
                          (score) =>
                            typeof score === "number" &&
                            Number.isFinite(score)
                        );

                        const average = scores.length
                          ? (
                              scores.reduce((sum, score) => sum + score, 0) /
                              scores.length
                            ).toFixed(2)
                          : "N/A";

                        return (
                          <div
                            key={evaluation.id}
                            style={{
                              marginTop: 12,
                              padding: 12,
                              border: "1px solid #d8e5de",
                              borderRadius: 9,
                            }}
                          >
                            <strong>Interview Score: {average} / 5</strong>
                            <p>
                              Recommendation: {evaluation.recommendation || "Pending"}
                            </p>
                            <small>
                              {evaluation.evaluator_id === userId
                                ? "Your Evaluation"
                                : "Team Evaluation"}
                            </small>
                          </div>
                        );
                      })}

                    {interview.status === "completed" && (
                      <div
                        style={{
                          marginTop: 16,
                          padding: 16,
                          border: "1px solid #d8e5de",
                          borderRadius: 10,
                        }}
                      >
                        <h3>Final Hiring Decision</h3>

                        {interviewDecisions
                          .filter((item) => item.interview_id === interview.id)
                          .map((item) => (
                            <div key={item.id}>
                              <p>
                                <strong>Decision:</strong> {item.decision}
                              </p>
                              <p>
                                <strong>Reason:</strong> {item.decision_reason}
                              </p>
                            </div>
                          ))}

                        <button
                          type="button"
                          onClick={() => {
                            const saved = interviewDecisions.find(
                              (item) => item.interview_id === interview.id
                            );

                            setDecidingInterviewId(interview.id);
                            setDecisionForm({
                              decision: saved?.decision ?? "",
                              decision_reason: saved?.decision_reason ?? "",
                            });
                          }}
                          style={{
                            padding: "10px 16px",
                            background: "#315f50",
                            color: "#fff",
                            border: 0,
                            borderRadius: 9,
                            cursor: "pointer",
                          }}
                        >
                          {interviewDecisions.some(
                            (item) => item.interview_id === interview.id
                          )
                            ? "Edit Final Decision"
                            : "Add Final Decision"}
                        </button>

                        {decidingInterviewId === interview.id && (
                          <div
                            style={{
                              display: "grid",
                              gap: 12,
                              marginTop: 14,
                            }}
                          >
                            <select
                              style={inputStyle}
                              value={decisionForm.decision}
                              onChange={(e) =>
                                setDecisionForm((prev) => ({
                                  ...prev,
                                  decision: e.target.value,
                                }))
                              }
                            >
                              <option value="">Select Decision</option>
                              <option value="Proceed">Proceed</option>
                              <option value="Hold">Hold</option>
                              <option value="Reject">Reject</option>
                            </select>

                            <textarea
                              style={inputStyle}
                              rows={4}
                              placeholder="Reason for final decision"
                              value={decisionForm.decision_reason}
                              onChange={(e) =>
                                setDecisionForm((prev) => ({
                                  ...prev,
                                  decision_reason: e.target.value,
                                }))
                              }
                            />

                            <button
                              type="button"
                              onClick={() => saveInterviewDecision(interview)}
                              disabled={savingDecision}
                              style={{
                                padding: "10px 16px",
                                background: "#315f50",
                                color: "#fff",
                                border: 0,
                                borderRadius: 9,
                                cursor: "pointer",
                              }}
                            >
                              {savingDecision
                                ? "Saving..."
                                : "Save Final Decision"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

{interview.status === "completed" &&
  interviewDecisions
    .filter(
      (item) =>
        item.interview_id === interview.id &&
        ["Proceed", "Reject"].includes(item.decision)
    )
    .map((decision) => (
      <div
        key={`pipeline-${decision.id}`}
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #d8e5de",
          borderRadius: 10,
        }}
      >
        <h3>Recruitment Pipeline Action</h3>

        <p>
          Final Decision: <strong>{decision.decision}</strong>
        </p>

        <p>
          Current Stage:{" "}
          <strong>
            {applications.find(
              (item) =>
                String(item.id) ===
                String(interview.application_id)
            )?.stage || "Unassigned"}
          </strong>
        </p>

        <button
          type="button"
          onClick={() => {
            setMovingApplicationId(interview.application_id);
            setSelectedPipelineStage("");
          }}
          style={{
            padding: "10px 16px",
            background: "#315f50",
            color: "#fff",
            border: 0,
            borderRadius: 9,
            cursor: "pointer",
          }}
        >
          Move to Pipeline
        </button>

        {String(movingApplicationId) ===
          String(interview.application_id) && (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 14,
            }}
          >
            {decision.decision === "Proceed" ? (
              <select
                style={inputStyle}
                value={selectedPipelineStage}
                onChange={(e) =>
                  setSelectedPipelineStage(e.target.value)
                }
              >
                <option value="">Select Pipeline Stage</option>
                <option value="Screening">Screening</option>
                <option value="Interview">Interview</option>
                <option value="Shortlisted">Shortlisted</option>
              </select>
            ) : (
              <p>
                Candidate will be moved to{" "}
                <strong>Rejected</strong>.
              </p>
            )}

            <button
              type="button"
              onClick={() => moveInterviewToPipeline(interview)}
              disabled={savingPipelineStage}
              style={{
                padding: "10px 16px",
                background: "#315f50",
                color: "#fff",
                border: 0,
                borderRadius: 9,
                cursor: "pointer",
              }}
            >
              {savingPipelineStage
                ? "Moving..."
                : "Confirm Pipeline Move"}
            </button>
          </div>
        )}
      </div>
    ))}

                    {interview.status !== "cancelled" && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          type="button"
                          
                          onClick={() => {
                            const savedEvaluation = interviewEvaluations.find(
                              (item) =>
                                item.interview_id === interview.id &&
                                item.evaluator_id === userId
                            );

                            setEvaluatingInterviewId(interview.id);

                            setEvaluationForm({
                              technical_skills:
                                savedEvaluation?.technical_skills ?? "",
                              communication_skills:
                                savedEvaluation?.communication_skills ?? "",
                              problem_solving:
                                savedEvaluation?.problem_solving ?? "",
                              culture_fit:
                                savedEvaluation?.culture_fit ?? "",
                              strengths:
                                savedEvaluation?.strengths ?? "",
                              areas_for_improvement:
                                savedEvaluation?.areas_for_improvement ?? "",
                              overall_feedback:
                                savedEvaluation?.overall_feedback ?? "",
                              recommendation:
                                savedEvaluation?.recommendation ?? "",
                            });
                          }}

                        >
                         
{interviewEvaluations.some(
  (item) =>
    item.interview_id === interview.id &&
    item.evaluator_id === userId
)
  ? "Edit Evaluation"
  : "Evaluate Interview"}

                        </button>

                        {evaluatingInterviewId === interview.id && (
                          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                            {[
                              ["technical_skills", "Technical Skills"],
                              ["communication_skills", "Communication Skills"],
                              ["problem_solving", "Problem Solving"],
                              ["culture_fit", "Culture Fit"],
                            ].map(([field, label]) => (
                              <label key={field}>
                                {label} (1–5)
                                <select
                                  style={inputStyle}
                                  value={evaluationForm[field]}
                                  onChange={(e) =>
                                    setEvaluationForm((prev) => ({
                                      ...prev,
                                      [field]: e.target.value,
                                    }))
                                  }
                                >
                                  <option value="">Select Score</option>
                                  {[1, 2, 3, 4, 5].map((score) => (
                                    <option key={score} value={score}>
                                      {score}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ))}

                            {[
                              ["strengths", "Strengths"],
                              ["areas_for_improvement", "Areas for Improvement"],
                              ["overall_feedback", "Overall Feedback"],
                            ].map(([field, label]) => (
                              <label key={field}>
                                {label}
                                <textarea
                                  style={inputStyle}
                                  value={evaluationForm[field]}
                                  onChange={(e) =>
                                    setEvaluationForm((prev) => ({
                                      ...prev,
                                      [field]: e.target.value,
                                    }))
                                  }
                                />
                              </label>
                            ))}

                            <label>
                              Hiring Recommendation
                              <select
                                style={inputStyle}
                                value={evaluationForm.recommendation}
                                onChange={(e) =>
                                  setEvaluationForm((prev) => ({
                                    ...prev,
                                    recommendation: e.target.value,
                                  }))
                                }
                              >
                                <option value="">Select Recommendation</option>
                                <option value="Hire">Hire</option>
                                <option value="Hold">Hold</option>
                                <option value="Reject">Reject</option>
                              </select>
                            </label>

                            <button
                              type="button"
                              disabled={savingEvaluation}
                              onClick={() => saveInterviewEvaluation(interview)}
                            >
                              {savingEvaluation
                                ? "Saving Evaluation..."
                                : "Save Evaluation"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
