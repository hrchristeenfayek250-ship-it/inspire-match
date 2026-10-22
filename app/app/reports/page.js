
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const stages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];

export default function ReportsPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
  });

 
  
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [stageHistory, setStageHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  useEffect(() => {
    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        setCandidates([]);
        setError("Please log in to view reports.");
        setLoading(false);
        return;
      }

     
      const { data: memberships, error: membershipError } =
        await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", authData.user.id)
          .limit(2);

      if (!active) return;

      if (
        membershipError ||
        !memberships ||
        memberships.length !== 1
      ) {
        setCandidates([]);
        setError("Please join a company to view reports.");
        setLoading(false);
        return;
      }

      const companyId = memberships[0].company_id;

      const start = new Date(`${month}-01T00:00:00`);
      const end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        1
      );

    
     
      const data = [];
      let queryError = null;
      const pageSize = 500;
      let candidateOffset = 0;

      while (true) {
        const { data: batch, error: batchError } = await supabase
          .from("candidates")
          .select(
            "id, full_name, current_title, status, source, created_at, hired_at, stage_entered_at, job_id, recruitment_type"
          )
          .or(
            `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${authData.user.id})`
          )
          .not("created_at", "is", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(candidateOffset, candidateOffset + pageSize - 1);

        if (batchError) {
          queryError = batchError;
          break;
        }

        data.push(...(batch || []));

        if (!batch || batch.length < pageSize) break;

        candidateOffset += pageSize;
      }

     
     
      const jobData = [];
      let jobError = null;
      let jobOffset = 0;

      while (true) {
        const { data: jobBatch, error: batchError } = await supabase
          .from("jobs")
          .select("id, title, status, created_at, filled_at")
          .or(
            `company_id.eq.${companyId},and(company_id.is.null,user_id.eq.${authData.user.id})`
          )
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(jobOffset, jobOffset + pageSize - 1);

        if (batchError) {
          jobError = batchError;
          break;
        }

        jobData.push(...(jobBatch || []));

        if (!jobBatch || jobBatch.length < pageSize) break;

        jobOffset += pageSize;
      }


    
      const candidateIds = data.map(c => c.id);

      const historyData = [];
      let historyError = null;

      if (!queryError && candidateIds.length > 0) {
        const idBatchSize = 100;

        for (
          let i = 0;
          i < candidateIds.length;
          i += idBatchSize
        ) {
          const idBatch = candidateIds.slice(i, i + idBatchSize);
          let historyOffset = 0;

          while (true) {
            const { data: historyBatch, error: batchError } =
              await supabase
                .from("candidate_stage_history")
                .select("candidate_id, from_stage, to_stage, changed_at")
                .in("candidate_id", idBatch)
                .order("changed_at", { ascending: false })
                .range(
                  historyOffset,
                  historyOffset + pageSize - 1
                );

            if (batchError) {
              historyError = batchError;
              break;
            }

            historyData.push(...(historyBatch || []));

            if (!historyBatch || historyBatch.length < pageSize) {
              break;
            }

            historyOffset += pageSize;
          }

          if (historyError) break;
        }
      }

      historyData.sort(
        (a, b) =>
          new Date(b.changed_at).getTime() -
          new Date(a.changed_at).getTime()
      );


    
      if (!active) return;

      if (queryError || jobError || historyError) {
        console.error("Recruitment analytics loading error:", {
          candidates: queryError,
          jobs: jobError,
          stageHistory: historyError,
        });

        setError(
          "Some recruitment data could not be loaded. Please refresh the page or contact support."
        );

        setCandidates([]);
        setJobs([]);
        setStageHistory([]);
      } else {
        setError("");
        setCandidates(data);
        setJobs(jobData);
        setStageHistory(historyData);
      }

      setLoading(false);

    }


    loadReport();

    return () => {
      active = false;
    };
  }, [month]);

  

const monthlyCandidates = candidates.filter((candidate) =>
  candidate.created_at?.startsWith(month)
);




const activeCandidates = candidates.filter(
  (candidate) =>
    candidate.recruitment_type === "Active Recruitment"
);

const pipelineStages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
];

const activePipelineCandidates = activeCandidates.filter(
  (candidate) =>
    pipelineStages.includes(
      String(candidate.status || "").trim()
    )
);

const recruitmentOutcomes = activeCandidates.filter(
  (candidate) =>
    ["Hired", "Rejected"].includes(
      String(candidate.status || "").trim()
    )
);

function countStage(stage) {
  return activeCandidates.filter(
    (candidate) =>
      String(candidate.status || "").trim().toLowerCase() ===
      stage.toLowerCase()
  ).length;
}


const averageDays = (items, start, end) => {
  const days = items
    .filter(x => x[start] && x[end])
    .map(x => (new Date(x[end]) - new Date(x[start])) / 86400000)
    .filter(x => Number.isFinite(x) && x >= 0);

  return days.length
    ? (days.reduce((a, b) => a + b, 0) / days.length).toFixed(1)
    : "N/A";
};

const timeToHire = averageDays(
  candidates.filter(x => x.hired_at?.startsWith(month)),
  "created_at", "hired_at"
);

const timeToFill = averageDays(
  jobs.filter(x => x.filled_at?.startsWith(month)),
  "created_at", "filled_at"
);
  
const stageSLA = {
  Applied: 3,
  Screening: 5,
  Interview: 7,
  Shortlisted: 5,
};


const stageAging = candidates
  .filter(c => Object.keys(stageSLA).includes(c.status))
  .map(c => {
    const latestTransition = stageHistory.find(
      h =>
        String(h.candidate_id) === String(c.id) &&
        h.to_stage === c.status
    );

    const enteredAt =
      latestTransition?.changed_at ||
      c.stage_entered_at ||
      (c.status === "Applied" ? c.created_at : null);

    if (!enteredAt) return null;

    const timestamp = new Date(enteredAt).getTime();

    if (!Number.isFinite(timestamp)) return null;

    const days = Math.max(
      0,
      Math.floor((Date.now() - timestamp) / 86400000)
    );

    return {
      ...c,
      daysInStage: days,
      slaDays: stageSLA[c.status],
      overdue: days > stageSLA[c.status],
    };
  })
  .filter(Boolean);


const overdueCandidates = stageAging.filter(c => c.overdue);
  
const sourceEffectiveness = Object.values(
  candidates.reduce((acc, candidate) => {
    const source = candidate.source?.trim() || "Unknown";

    if (!acc[source]) {
      acc[source] = { source, total: 0, hired: 0 };
    }

    acc[source].total += 1;

    if (candidate.status?.toLowerCase() === "hired") {
      acc[source].hired += 1;
    }

    return acc;
  }, {})
).map(item => ({
  ...item,
  conversionRate: item.total
    ? ((item.hired / item.total) * 100).toFixed(1)
    : "0.0",
}));
  

const conversionStages = [
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
];

const stageConversion = conversionStages
  .slice(0, -1)
  .map((from, index) => {
    const to = conversionStages[index + 1];

    const entered = new Set();
    const progressed = new Set();

    const reachedStages = new Map();

    stageHistory.forEach(h => {
      const id = String(h.candidate_id);

      if (!reachedStages.has(id)) {
        reachedStages.set(id, new Set());
      }

      if (h.from_stage) {
        reachedStages.get(id).add(h.from_stage);
      }

      if (h.to_stage) {
        reachedStages.get(id).add(h.to_stage);
      }
    });

    reachedStages.forEach((reached, id) => {
      if (!reached.has(from)) return;

      entered.add(id);

      const reachedLaterStage = conversionStages
        .slice(index + 1)
        .some(stage => reached.has(stage));

      if (reachedLaterStage) {
        progressed.add(id);
      }
    });

    return {
      from,
      to,
      total: entered.size,
      converted: progressed.size,
      rate: entered.size
        ? ((progressed.size / entered.size) * 100).toFixed(1)
        : null,
    };
  });

  
const bottleneckAnalysis = Object.keys(stageSLA).map(stage => {
  const currentCandidates = stageAging.filter(
    c => c.status === stage
  );

  const total = currentCandidates.length;

  const overdue = currentCandidates.filter(
    c => c.overdue
  ).length;

  const averageDays = total
    ? currentCandidates.reduce(
        (sum, c) => sum + c.daysInStage, 0
      ) / total
    : null;

  return {
    stage,
    total,
    overdue,
    averageDays: averageDays === null
      ? null
      : Number(averageDays.toFixed(1)),
    sla: stageSLA[stage],
    risk: overdue > 0 ? "High" : "Normal"
  };
});
  
const timeInStage = Object.keys(stageSLA).map(stage => {
  const durations = [];

  const historyByCandidate = {};

  stageHistory.forEach(h => {
    const id = String(h.candidate_id);
    if (!historyByCandidate[id]) {
      historyByCandidate[id] = [];
    }
    historyByCandidate[id].push(h);
  });

  Object.values(historyByCandidate).forEach(history => {
    const sorted = [...history].sort(
      (a, b) => new Date(a.changed_at) - new Date(b.changed_at)
    );

    sorted.forEach((entry, index) => {
      if (entry.to_stage !== stage) return;

      const next = sorted.slice(index + 1).find(
        h => h.from_stage === stage
      );

      if (!next) return;

      const days =
        (new Date(next.changed_at) - new Date(entry.changed_at)) /
        86400000;

      if (Number.isFinite(days) && days >= 0) {
        durations.push(days);
      }
    });
  });

  return {
    stage,
    transitions: durations.length,
    averageDays: durations.length
      ? Number(
          (durations.reduce((a, b) => a + b, 0) /
            durations.length).toFixed(1)
        )
      : null,
    sla: stageSLA[stage]
  };
});





  




  const periodLabel = new Date(
    `${month}-01T12:00:00`
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const green = "#245c4a";

  return (
    
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        maxWidth: "none",
        margin: 0,
        padding: 0,
        background: "#f6f8fb",
        fontFamily: "Arial, sans-serif",
        color: "#1e293b",
      }}
    >

      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          body * {
            visibility: hidden !important;
          }

          .report-print,
          .report-print * {
            visibility: visible !important;
          }

          .report-print {
            position: absolute !important;
            top: 0;
            left: 0;
            width: 100%;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .no-print {
            display: none !important;
          }

          thead {
            display: table-header-group;
          }

          tr {
            break-inside: avoid;
          }
                  .pipeline-print-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
            gap: 8px !important;
            margin-bottom: 15px !important;
          }

          
table td,
table th {
  padding: 6px 8px !important;
  font-size: 11px !important;
}
          .pipeline-print-grid > div {
            padding: 10px !important;
          }
        }
      `}</style>

      
      <style>{`
        .ir-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 254px;
          background: #ffffff;
          border-right: 1px solid #e6eaf0;
          padding: 24px 15px;
          display: flex;
          flex-direction: column;
          z-index: 20;
          font-family: Arial, sans-serif;
          overflow-y: auto;
        }

        .ir-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }

        .ir-logo {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #284e42;
          color: #ffffff;
          font-size: 23px;
          font-weight: 800;
        }

        .ir-brand strong {
          display: block;
          color: #1e293b;
          font-size: 17px;
          letter-spacing: -.5px;
        }

        .ir-brand small {
          display: block;
          color: #8795a4;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-top: 4px;
        }

        .ir-nav-label {
          padding: 0 14px;
          margin-bottom: 10px;
          color: #9ba6b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .ir-nav {
          display: grid;
          gap: 4px;
        }

        .ir-nav a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-left: 3px solid transparent;
          border-radius: 10px;
          text-decoration: none;
          color: #657285;
          font-size: 13px;
          font-weight: 600;
        }

        .ir-nav a span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }

        .ir-nav a:hover {
          background: #f4f7f6;
        }

        .ir-nav a.active {
          background: #eaf3ee;
          color: #245340;
          border-left-color: #315f50;
          font-weight: 800;
        }

        .ir-nav-footer {
          margin-top: auto;
          padding: 30px 14px 5px;
        }

       
        .ir-nav-footer a {
          color: #657285;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
        }

        
        .ir-workspace {
          margin-left: 254px;
          max-width: none;
          min-width: 0;
          padding: 32px clamp(20px, 3vw, 48px) 50px;
          font-family: Arial, sans-serif;
          color: #1e293b;
        }



        .ir-breadcrumb {
          color: #8390a0;
          font-size: 12px;
          margin: 0 0 10px;
        }

        .ir-breadcrumb strong {
          color: #315f50;
        }

        .ir-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 25px;
        }

        .ir-header h1 {
          margin: 0;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -1.3px;
        }

        .ir-header p {
          color: #8390a0;
          font-size: 13px;
          line-height: 1.7;
          margin: 11px 0 0;
        }

        .ir-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .ir-month {
          min-height: 44px;
          border: 1px solid #e1e6ed;
          border-radius: 10px;
          background: #ffffff;
          padding: 10px 13px;
          color: #526073;
          font-family: Arial, sans-serif;
          font-size: 13px;
        }

        .ir-export {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 12px 18px;
          border: 1px solid #284e42;
          border-radius: 10px;
          background: #284e42;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .ir-export:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .ir-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 24px;
        }

        .ir-kpi {
          padding: 21px;
          background: #ffffff;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(23,35,50,.035);
          min-width: 0;
        }

        .ir-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: #647182;
          font-size: 12px;
          font-weight: 700;
        }

        .ir-kpi-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: #edf4f0;
          color: #315f50;
          font-size: 20px;
        }

        .ir-kpi strong {
          display: block;
          color: #1e293b;
          font-size: 33px;
          letter-spacing: -1px;
          margin: 11px 0 5px;
        }

        .ir-kpi small {
          color: #96a0ad;
          font-size: 11px;
          line-height: 1.6;
        }

        .ir-analytics {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr);
          gap: 17px;
          margin-bottom: 26px;
        }

        .ir-panel {
          min-width: 0;
          padding: 24px;
          background: #ffffff;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(23,35,50,.035);
        }

        .ir-panel-heading {
          margin-bottom: 24px;
        }

        .ir-panel-heading h2 {
          margin: 0 0 7px;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 17px;
          font-weight: 800;
        }

        .ir-panel-heading p {
          margin: 0;
          color: #8994a3;
          font-size: 12px;
          line-height: 1.7;
        }

        .ir-stage-row {
          display: grid;
          grid-template-columns: 90px minmax(0, 1fr) 35px;
          align-items: center;
          gap: 13px;
          margin-bottom: 19px;
        }

        .ir-stage-label {
          font-size: 12px;
          font-weight: 700;
          color: #526073;
        }

        .ir-stage-track {
          width: 100%;
          height: 11px;
          background: #eef2f4;
          overflow: hidden;
          border-radius: 20px;
        }

        .ir-stage-fill {
          height: 100%;
          border-radius: 20px;
        }

        .ir-stage-number {
          text-align: right;
          color: #526073;
          font-size: 12px;
          font-weight: 800;
        }

        .ir-donut {
          width: 176px;
          height: 176px;
          margin: 10px auto 20px;
          border-radius: 50%;
          display: grid;
          place-items: center;
        }

        .ir-donut-hole {
          width: 125px;
          height: 125px;
          border-radius: 50%;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #1e293b;
        }

        .ir-donut-hole strong {
          font-size: 31px;
          font-weight: 800;
        }

        .ir-donut-hole small {
          font-size: 11px;
          color: #8994a3;
          margin-top: 4px;
        }

        .ir-classification {
          display: grid;
          gap: 12px;
        }

        .ir-classification-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #647182;
          font-size: 12px;
        }

        .ir-classification-row span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .ir-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }

        .ir-classification-row strong {
          color: #1e293b;
        }

        .ir-report-label {
          margin: 0 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ir-report-label h2 {
          margin: 0;
          font-family: Arial, sans-serif;
          color: #1e293b;
          font-size: 19px;
          font-weight: 800;
        }

        .ir-report-label small {
          color: #8994a3;
          font-size: 12px;
        }

        .ir-mobile-nav {
          display: none;
        }

        @media screen and (max-width: 1150px) {
          .ir-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .ir-analytics {
            grid-template-columns: 1fr;
          }
        }

        @media screen and (max-width: 850px) {
          .ir-sidebar {
            display: none;
          }

          .ir-workspace {
            margin-left: 0;
            padding: 0 0 30px;
          }

          .ir-mobile-nav {
            display: flex;
            gap: 8px;
            overflow-x: auto;
            margin-bottom: 23px;
            padding-bottom: 8px;
          }

          .ir-mobile-nav a {
            flex-shrink: 0;
            padding: 11px 14px;
            border-radius: 9px;
            background: #ffffff;
            border: 1px solid #e6eaf0;
            color: #526073;
            font-size: 12px;
            text-decoration: none;
          }

          .ir-mobile-nav a.active {
            background: #284e42;
            color: #ffffff;
          }
        }

        @media screen and (max-width: 540px) {
          .ir-header h1 {
            font-size: 29px;
          }

          .ir-kpis {
            gap: 10px;
          }

          .ir-kpi {
            padding: 15px;
          }

          .ir-kpi strong {
            font-size: 27px;
          }

          .ir-panel {
            padding: 18px;
          }

          .ir-stage-row {
            grid-template-columns: 75px minmax(0, 1fr) 25px;
            gap: 8px;
          }
        }

        @media print {
          .ir-sidebar,
          .ir-screen,
          .ir-mobile-nav {
            display: none !important;
          }

          .ir-workspace {
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }
        }
        /* REPORTS — FINAL SPACING FIX */
        @media screen {
          .ir-sidebar {
            width: 220px;
            box-sizing: border-box;
          }

.ir-workspace {
            margin-left: 220px;
            width: calc(100% - 220px);
            max-width: none;
            min-width: 0;
            box-sizing: border-box;
            padding: 32px clamp(20px, 3vw, 48px) 50px;
          }

.ir-kpis {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 18px;
          }

.ir-analytics {
            grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
            gap: 20px;
          }

.ir-panel {
            min-width: 0;
            padding: 26px;
          }
        }

@media screen and (max-width: 1250px) {
          .ir-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

.ir-analytics {
            grid-template-columns: minmax(0, 1fr);
          }
        }

@media screen and (max-width: 850px) {
          .ir-sidebar {
            display: none;
          }

.ir-workspace {
            margin-left: 0;
            width: 100%;
            padding: 24px 18px 40px;
          }
        }

@media screen and (max-width: 540px) {
          .ir-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

.ir-kpi {
            padding: 16px;
          }

.ir-panel {
            padding: 18px;
          }
        }
`}</style>
      <aside className="ir-sidebar no-print">
        <div className="ir-brand">
          <div className="ir-logo">I</div>
          <div>
            <strong>Inspire Match</strong>
            <small>TALENT INTELLIGENCE</small>
          </div>
        </div>

        <div className="ir-nav-label">WORKSPACE</div>

        <nav className="ir-nav">
          {[
            ["Overview", "/app/dashboard", "◫"],
            ["Jobs", "/app/jobs", "▣"],
            ["Candidates", "/app/candidates", "♙"],
            ["Pipeline", "/app/pipeline", "⇄"],
            ["AI Matching", "/app/matching", "✧"],
            ["Reports", "/app/reports", "▥"],
            ["Executive", "/app/executive", "◈"],
            ["Team", "/app/team", "♧"],
          ].map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              className={
                href === "/app/reports" ? "active" : ""
              }
            >
              <span>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="ir-nav-footer">
          <Link href="/">↗ ATS Home</Link>
        </div>
      </aside>

      <div className="ir-workspace">
        <div className="ir-screen no-print">
          <div className="ir-mobile-nav">
            {[
              ["Overview", "/app/dashboard"],
              ["Jobs", "/app/jobs"],
              ["Candidates", "/app/candidates"],
              ["Pipeline", "/app/pipeline"],
              ["AI Matching", "/app/matching"],
              ["Reports", "/app/reports"],
              ["Executive", "/app/executive"],
              ["Team", "/app/team"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={
                  href === "/app/reports" ? "active" : ""
                }
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="ir-breadcrumb">
            Workspace / <strong>Reports & Analytics</strong>
          </div>

          <header className="ir-header">
            <div>
              <h1>Inspire Reports</h1>
              <p>
                Recruitment intelligence, pipeline analytics
                and executive reporting.
              </p>
            </div>

            <div className="ir-controls">
              <input
                type="month"
                className="ir-month"
                aria-label="Reporting month"
                value={month}
                onChange={(event) =>
                  setMonth(event.target.value)
                }
              />

              <button
                type="button"
                className="ir-export"
                onClick={() => window.print()}
                disabled={loading || Boolean(error)}
              >
                ↓ Export PDF
              </button>
            </div>
          </header>

          <div className="ir-kpis">
            {[
              {
                label: "Candidates Added",
              
value: monthlyCandidates.length,

                note: "Added in the selected month",
                icon: "♙",
              },
              {
                label: "Active Pipeline",
                value:
                  countStage("Applied") +
                  countStage("Screening") +
                  countStage("Interview") +
                  countStage("Shortlisted"),
                note: "Active Recruitment candidates",
                icon: "⇄",
              },
              {
                label: "Interview Ready",
                value:
                  countStage("Interview") +
                  countStage("Shortlisted"),
                note: "Interview and shortlisted stages",
                icon: "◈",
              },
             
              {
                label: "Active Pipeline",
                value: activePipelineCandidates.length,
                note: "Current active pipeline across all months",
                icon: "⇄",
              },
              {
                label: "Interview Ready",
                value: activePipelineCandidates.filter(
                  (candidate) =>
                    ["Interview", "Shortlisted"].includes(
                      String(candidate.status || "").trim()
                    )
                ).length,
                note: "Current interview and shortlisted candidates",
                icon: "◈",
              },
              {
                label: "Hired",
                value: recruitmentOutcomes.filter(
                  (candidate) =>
                    String(candidate.status || "").trim() === "Hired"
                ).length,
                note: "Total hired across all months",
                icon: "✓",
              },

              
              {
                label: "Time to Hire",
                value: timeToHire === "N/A" ? "N/A" : `${timeToHire} days`,
                note: "Average days from candidate creation to hire",
                icon: "◷",
              },
              {
                label: "Time to Fill",
                value: timeToFill === "N/A" ? "N/A" : `${timeToFill} days`,
                note: "Average days from job creation to closure",
                icon: "◴",
              },

            ].map((item) => (
              <div className="ir-kpi" key={item.label}>
                <div className="ir-kpi-top">
                  <span>{item.label}</span>
                  <span className="ir-kpi-icon">
                    {item.icon}
                  </span>
                </div>

                <strong>
                  {loading ? "—" : item.value}
                </strong>

                <small>{item.note}</small>
              </div>
            ))}
          </div>


<section
  className="ir-panel"
  style={{
    marginBottom: 28,
    padding: 28,
    borderRadius: 22,
    background: "#fff",
    border: "1px solid #e4eee9",
    boxShadow: "0 8px 30px rgba(20,65,49,0.05)"
  }}
>
  <div style={{ marginBottom: 24 }}>
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 2,
      color: "#3c9375",
      marginBottom: 9
    }}>
      PIPELINE INTELLIGENCE
    </div>
    <h2 style={{
      fontSize: 26,
      fontWeight: 800,
      color: "#173e32",
      margin: "0 0 8px"
    }}>
      Stage Aging & SLA
    </h2>
    
    <p style={{ color: "#81938b", fontSize: 13, margin: 0 }}>
      Monitor candidate waiting times and identify SLA breaches.
      Includes all currently tracked candidates across all months.
      SLA is measured from each candidate's latest recorded
      stage entry date.
    </p>

  </div>

  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 26
  }}>
    {[
      {
        label: "TRACKED CANDIDATES",
        value: stageAging.length,
        color: "#205e48",
        bg: "#f5faf7"
      },
      {
        label: "ON TRACK",
        value: stageAging.length - overdueCandidates.length,
        color: "#247a57",
        bg: "#eef8f1"
      },
      {
        label: "OVERDUE",
        value: overdueCandidates.length,
        color: "#b45309",
        bg: "#fff7ed"
      }
    ].map(item => (
      <div key={item.label} style={{
        padding: "20px 22px",
        borderRadius: 16,
        background: item.bg,
        border: "1px solid #e5eee8"
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1.1,
          color: "#71877b",
          marginBottom: 12
        }}>
          {item.label}
        </div>
        <strong style={{
          fontSize: 30,
          color: item.color
        }}>
          {item.value}
        </strong>
      </div>
    ))}
  </div>

  {stageAging.length === 0 ? (
    <div style={{
      padding: "32px 20px",
      textAlign: "center",
      borderRadius: 16,
      background: "#f7faf8",
      color: "#82968b"
    }}>
      No stage aging data available yet.
    </div>
  ) : (
    <div style={{
      overflowX: "auto",
      border: "1px solid #e7eee9",
      borderRadius: 16
    }}>
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "left",
        fontSize: 13
      }}>
        <thead style={{ background: "#f3f8f5" }}>
          <tr>
            {["CANDIDATE", "STAGE", "DAYS IN STAGE", "SLA LIMIT", "STATUS"].map(h => (
              <th key={h} style={{
                padding: "17px 18px",
                color: "#668476",
                fontSize: 10,
                letterSpacing: 0.8,
                fontWeight: 800
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stageAging
            .slice()
            .sort((a, b) => Number(b.overdue) - Number(a.overdue))
            .map(c => (
              <tr key={c.id} style={{
                borderTop: "1px solid #edf2ee"
              }}>
                <td style={{
                  padding: "17px 18px",
                  fontWeight: 700,
                  color: "#234b3b"
                }}>
                  {c.full_name || "Unnamed"}
                </td>
                <td style={{ padding: "17px 18px", color: "#627c6f" }}>
                  {c.status}
                </td>
                <td style={{
                  padding: "17px 18px",
                  fontWeight: 800,
                  color: "#234b3b"
                }}>
                  {c.daysInStage}
                </td>
                <td style={{ padding: "17px 18px", color: "#627c6f" }}>
                  {c.slaDays} days
                </td>
                <td style={{ padding: "17px 18px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    background: c.overdue ? "#fff1e6" : "#e8f5ed",
                    color: c.overdue ? "#b45309" : "#247a57"
                  }}>
                    {c.overdue ? "Overdue" : "On Track"}
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )}
</section>



<section
  className="ir-panel"
  style={{
    marginBottom: 28,
    padding: 28,
    borderRadius: 22,
    background: "#ffffff",
    border: "1px solid #e4eee9",
    boxShadow: "0 8px 30px rgba(20, 65, 49, 0.05)"
  }}
>
  <div style={{ marginBottom: 26 }}>
    <div style={{
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 2,
      color: "#3c9375",
      marginBottom: 9
    }}>
      TALENT ACQUISITION INTELLIGENCE
    </div>

    <h2 style={{
      fontSize: 26,
      fontWeight: 800,
      color: "#173e32",
      margin: "0 0 8px"
    }}>
      Source Effectiveness
    </h2>

    
    <p style={{ color: "#81938b", margin: 0, fontSize: 13 }}>
      Understand where your talent comes from and which
      channels deliver successful hires.
      Includes candidates from all months.
      Conversion rates represent the percentage of candidates
      from each source who are currently marked as Hired.
    </p>

  </div>

  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 30
  }}>
    {[
      {
        label: "TOTAL SOURCES",
        value: sourceEffectiveness.length
      },
      {
        label: "TOTAL CANDIDATES",
        value: sourceEffectiveness.reduce((s, x) => s + x.total, 0)
      },
      {
        label: "TOTAL HIRED",
        value: sourceEffectiveness.reduce((s, x) => s + x.hired, 0)
      }
    ].map(card => (
      <div key={card.label} style={{
        padding: "20px 22px",
        background: "#f5faf7",
        border: "1px solid #e2efe8",
        borderRadius: 16
      }}>
        <div style={{
          fontSize: 10,
          letterSpacing: 1.2,
          fontWeight: 800,
          color: "#759486",
          marginBottom: 12
        }}>
          {card.label}
        </div>
        <div style={{
          fontSize: 30,
          fontWeight: 800,
          color: "#205e48"
        }}>
          {card.value}
        </div>
      </div>
    ))}
  </div>

  <div style={{
    display: "flex",
    flexDirection: "column",
    gap: 20
  }}>
    {sourceEffectiveness
      .slice()
      .sort((a, b) => b.total - a.total)
      .map(item => {
        const max = Math.max(
          1,
          ...sourceEffectiveness.map(s => s.total)
        );

        return (
          <div key={item.source} style={{
            padding: "20px 22px",
            border: "1px solid #e8efeb",
            borderRadius: 16,
            background: "#ffffff"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16
            }}>
              <strong style={{
                fontSize: 16,
                color: "#204d3e"
              }}>
                {item.source}
              </strong>

              <span style={{
                background: "#e8f5ed",
                color: "#257251",
                borderRadius: 999,
                padding: "7px 13px",
                fontSize: 12,
                fontWeight: 800
              }}>
                {item.conversionRate}% Conversion
              </span>
            </div>

            <div style={{
              height: 12,
              background: "#edf3ef",
              borderRadius: 999,
              overflow: "hidden",
              marginBottom: 16
            }}>
              <div style={{
                height: "100%",
                width: `${(item.total / max) * 100}%`,
                background: "linear-gradient(90deg, #245c4a, #68b996)",
                borderRadius: 999
              }} />
            </div>

            <div style={{
              display: "flex",
              gap: 24,
              flexWrap: "wrap",
              fontSize: 13,
              color: "#687f73"
            }}>
              <span>
                <strong style={{ color: "#214e3c" }}>
                  {item.total}
                </strong> Candidates
              </span>

              <span>
                <strong style={{ color: "#214e3c" }}>
                  {item.hired}
                </strong> Hired
              </span>
            </div>
          </div>
        );
      })}

    {sourceEffectiveness.length === 0 && (
      <p style={{ color: "#82968b" }}>

        No candidate source data available yet.
      </p>
    )}
  </div>
</section>
<section style={{
  background: "#fff",
  border: "1px solid #e1eae4",
  borderRadius: 22,
  padding: 28,
  marginBottom: 28
}}>
  <div style={{
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 2,
    color: "#5b9277"
  }}>
    PIPELINE INTELLIGENCE
  </div>

  <h2 style={{ color: "#204d3e", margin: "10px 0" }}>
    Stage Conversion Rates
  </h2>

  <p style={{ color: "#71867a", marginBottom: 24 }}>
    Track candidate progression and identify recruitment bottlenecks.
  </p>

  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16
  }}>
    {stageConversion.map(item => (
      <div key={`${item.from}-${item.to}`} style={{
        padding: 22,
        border: "1px solid #e5eee8",
        borderRadius: 16,
        background: "#fbfdfb"
      }}>
        <div style={{
          color: "#637e6f",
          fontSize: 13,
          fontWeight: 700
        }}>
          {item.from} → {item.to}
        </div>

        <div style={{
          fontSize: 34,
          fontWeight: 800,
          color: "#245c4a",
          margin: "14px 0"
        }}>
          {item.rate === null ? "N/A" : `${item.rate}%`}
        </div>

        <div style={{
          height: 9,
          borderRadius: 20,
          background: "#e8f0ea",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${item.rate ?? 0}%`,
            height: "100%",
            borderRadius: 20,
            background: "linear-gradient(90deg, #245c4a, #68b996)"
          }} />
        </div>

        <p style={{
          color: "#74877b",
          fontSize: 12,
          marginTop: 14
        }}>
          {item.converted} of {item.total} tracked candidates progressed
        </p>
      </div>
    ))}
  </div>

 
  <p style={{ color: "#87988e", fontSize: 12, marginTop: 20 }}>
    Conversion rates are calculated using recorded candidate stage
    history, including progression to later stages when intermediate
    stages were skipped. Historical transitions before tracking was
    enabled are not included. Results may be incomplete for older
    candidates.
  </p>

</section>
      
<section style={{
  background: "#fff",
  border: "1px solid #e4eee9",
  borderRadius: 22,
  padding: 28,
  marginBottom: 28,
  boxShadow: "0 8px 30px rgba(20,65,49,0.05)"
}}>
  <div style={{
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 2,
    color: "#3c9375"
  }}>
    RECRUITMENT INTELLIGENCE
  </div>

  <h2 style={{
    fontSize: 26,
    fontWeight: 800,
    color: "#173e32",
    margin: "10px 0"
  }}>
  Stage Aging & SLA Intelligence
  </h2>

  <p style={{
    color: "#81938b",
    fontSize: 13,
    marginBottom: 26
  }}>
    Identify stages with long waiting times and SLA breaches.
  </p>

  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16
  }}>
    {bottleneckAnalysis.map(item => (
      <div key={item.stage} style={{
        padding: 22,
        borderRadius: 16,
        background: "#f8fbf9",
        border: "1px solid #e5eee8"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 20
        }}>
          <strong style={{ color: "#204d3e", fontSize: 16 }}>
            {item.stage}
          </strong>

          <span style={{
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 800,
            color: item.overdue > 0 ? "#b45309" : "#247a57",
            background: item.overdue > 0 ? "#fff1e6" : "#e8f5ed"
          }}>
            {item.total === 0
              ? "No Data"
              : item.overdue > 0
                ? "Attention"
                : "On Track"}
          </span>
        </div>

        <div style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#245c4a"
        }}>
          {item.averageDays === null
            ? "N/A"
            : `${item.averageDays} days`}
        </div>

        <div style={{
          fontSize: 12,
          color: "#81938b",
          margin: "8px 0 18px"
        }}>
          Average current stage aging
        </div>

        <div style={{
          height: 9,
          background: "#e8f0ea",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 18
        }}>
          <div style={{
            height: "100%",
            width: `${Math.min(
              100,
              ((item.averageDays || 0) / item.sla) * 100
            )}%`,
            background: item.overdue > 0
              ? "#e7a15b"
              : "linear-gradient(90deg, #245c4a, #68b996)",
            borderRadius: 999
          }} />
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#688072"
        }}>
          <span>{item.total} Candidates</span>
          <span>SLA: {item.sla} days</span>
        </div>

        <div style={{
          marginTop: 14,
          fontSize: 12,
          fontWeight: 700,
          color: item.overdue > 0 ? "#b45309" : "#247a57"
        }}>
          {item.overdue} Overdue Candidates
        </div>
      </div>
    ))}
  </div>

  <p style={{
    color: "#87988e",
    fontSize: 12,
    marginTop: 22
  }}>
    Based on current tracked candidates. Historical completed-stage
    durations are not included.
  </p>
</section>

<section style={{
  background: "#ffffff",
  border: "1px solid #e1ebe5",
  borderRadius: 24,
  padding: 28,
  margin: "26px 0",
  boxShadow: "0 12px 35px rgba(23,62,50,0.05)"
}}>
  <div style={{ marginBottom: 24 }}>
    <h2 style={{
      color: "#173e32",
      fontSize: 26,
      fontWeight: 800,
      margin: "0 0 10px"
    }}>
      Time in Stage Analysis
    </h2>
    <p style={{ color: "#81938b", fontSize: 13 }}>
      Historical time spent in completed recruitment stages,
      based on recorded candidate transitions.
    </p>
  </div>

  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16
  }}>
    {timeInStage.map(item => {
      const hasData = item.averageDays !== null;
      const exceedsSLA = hasData && item.averageDays > item.sla;

      return (
        <div key={item.stage} style={{
          background: "#f8fbf9",
          border: "1px solid #e2eee7",
          borderRadius: 18,
          padding: 22
        }}>
          <div style={{
            fontSize: 13,
            color: "#688072",
            fontWeight: 700
          }}>
            {item.stage}
          </div>

          <div style={{
            fontSize: 34,
            fontWeight: 800,
            color: "#173e32",
            margin: "14px 0 6px"
          }}>
            {hasData ? `${item.averageDays} days` : "N/A"}
          </div>

          <div style={{
            fontSize: 12,
            color: "#81938b"
          }}>
            Average completed-stage duration
          </div>

          <div style={{
            height: 1,
            background: "#e1ebe5",
            margin: "18px 0"
          }} />

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#688072"
          }}>
            <span>{item.transitions} Transitions</span>
            <span>SLA: {item.sla} days</span>
          </div>

          <div style={{
            marginTop: 14,
            fontSize: 12,
            fontWeight: 700,
            color: !hasData
              ? "#81938b"
              : exceedsSLA
                ? "#b45309"
                : "#247a57"
          }}>
            {!hasData
              ? "Insufficient History"
              : exceedsSLA
                ? "Above SLA Average"
                : "Within SLA Average"}
          </div>
        </div>
      );
    })}
  </div>

  <p style={{
    color: "#87988e",
    fontSize: 12,
    marginTop: 22
  }}>
    Only completed stages with recorded entry and exit
    transitions are included. Historical activity before
    stage tracking was enabled is unavailable.
  </p>
</section>

<div className="ir-analytics">
            <section className="ir-panel">
              <div className="ir-panel-heading">
                <h2>Recruitment Pipeline</h2>
                <p>
                  Current stages of Active Recruitment
                  candidates added in {periodLabel}.
                </p>
              </div>

              {stages.map((stage, index) => {
                const count = countStage(stage);
                const percentage = activeCandidates.length
                  ? (count / activeCandidates.length) * 100
                  : 0;

                const colors = [
                  "#315f50",
                  "#548675",
                  "#76a995",
                  "#a4c8ba",
                  "#d1a353",
                  "#c77878",
                ];

                return (
                  <div className="ir-stage-row" key={stage}>
                    <span className="ir-stage-label">
                      {stage}
                    </span>

                    <div className="ir-stage-track">
                      <div
                        className="ir-stage-fill"
                        style={{
                          width: `${percentage}%`,
                          background: colors[index],
                        }}
                      />
                    </div>

                    <span className="ir-stage-number">
                      {loading ? "—" : count}
                    </span>
                  </div>
                );
              })}

              <p
                style={{
                  margin: "20px 0 0",
                  fontSize: 11,
                  color: "#96a0ad",
                  lineHeight: 1.7,
                }}
              >
                Based on current candidate stages.
                Percentages are not stage-to-stage
                conversion rates.
              </p>
            </section>

            <section className="ir-panel">
              <div className="ir-panel-heading">
                <h2>Recruitment Classification</h2>
                <p>
                  Candidate distribution for {periodLabel}.
                </p>
              </div>

              {(() => {
                const total = candidates.length;
                const active = activeCandidates.length;
                const talentPool = candidates.filter(
                  (candidate) =>
                    candidate.recruitment_type === "Talent Pool"
                ).length;
                const other = Math.max(
                  0,
                  total - active - talentPool
                );

                const activePercent = total
                  ? (active / total) * 100
                  : 0;
                const talentPercent = total
                  ? (talentPool / total) * 100
                  : 0;

                return (
                  <>
                    <div
                      className="ir-donut"
                      style={{
                        background: total
                          ? `conic-gradient(
                              #315f50 0% ${activePercent}%,
                              #9bcdbb ${activePercent}%
                              ${activePercent + talentPercent}%,
                              #e2e8ed
                              ${activePercent + talentPercent}% 100%
                            )`
                          : "#e2e8ed",
                      }}
                    >
                      <div className="ir-donut-hole">
                        <strong>
                          {loading ? "—" : total}
                        </strong>
                        <small>Total Candidates</small>
                      </div>
                    </div>

                    <div className="ir-classification">
                      {[
                        {
                          label: "Active Recruitment",
                          count: active,
                          color: "#315f50",
                        },
                        {
                          label: "Talent Pool",
                          count: talentPool,
                          color: "#9bcdbb",
                        },
                        {
                          label: "Other / Unclassified",
                          count: other,
                          color: "#e2e8ed",
                        },
                      ].map((item) => (
                        <div
                          className="ir-classification-row"
                          key={item.label}
                        >
                          <span>
                            <i
                              className="ir-dot"
                              style={{
                                background: item.color,
                              }}
                            />
                            {item.label}
                          </span>
                          <strong>
                            {loading ? "—" : item.count}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </section>
          </div>

          <div className="ir-report-label">
            <h2>Detailed Recruitment Report</h2>
            <small>
              Full report preview · {periodLabel}
            </small>
          </div>
        </div>

        <section
          className="report-print"
          style={{
            background: "#fff",
            border: "1px solid #dce9df",
            borderRadius: 16,
            padding: 30,
            boxShadow: "0 8px 24px rgba(30,59,50,0.05)",
          }}
        >
          
          <div
            style={{
              background: "#edf5ef",
              border: "1px solid #d9e8dd",
              borderLeft: "7px solid #245c4a",
              borderRadius: 16,
              padding: "28px 30px",
              marginBottom: 26,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#245c4a",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 2,
                    marginBottom: 14,
                  }}
                >
                  HIRE & INSPIRE BY CHRISTINE
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#738578",
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    marginBottom: 8,
                  }}
                >
                  RECRUITMENT INTELLIGENCE REPORT
                </div>

                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 32,
                    color: "#173e32",
                    margin: "0 0 12px",
                  }}
                >
                  Candidate Pipeline Report
                </h2>

                <p
                  style={{
                    fontSize: 13,
                    color: "#576c5f",
                    margin: 0,
                  }}
                >
                  Talent pipeline overview, hiring progress
                  and candidate insights.
                </p>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #d6e6d9",
                  borderRadius: 12,
                  padding: "15px 20px",
                }}
              >
                <div
                  style={{
                    color: "#7a8c80",
                    fontSize: 10,
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    marginBottom: 7,
                  }}
                >
                  REPORTING PERIOD
                </div>
                <div
                  style={{
                    color: "#245c4a",
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  {periodLabel}
                </div>
            </div>
          </div>
</div>

          {loading ? (
            <p>Loading report...</p>
          ) : error ? (
            <p style={{ color: "#b91c1c" }}>{error}</p>
          ) : (
            <>
              
             
<div
  style={{
    background: "#f7faf8",
    border: "1px solid #dce9df",
    borderRadius: 14,
    padding: 20,
    marginBottom: 22,
  }}
>
  <h3 style={{ color: "#245c4a", marginTop: 0 }}>
    Recruitment Classification Overview
  </h3>

  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  }}>
    {[
      {
        label: "Talent Pool",
        count: candidates.filter(
          c => c.recruitment_type === "Talent Pool"
        ).length,
      },
      {
        label: "Active Recruitment",
        count: candidates.filter(
          c => c.recruitment_type === "Active Recruitment"
        ).length,
      },
      {
        label: "Not Classified",
        count: candidates.filter(
          c => !c.recruitment_type
        ).length,
      },
    ].map(item => (
      <div key={item.label} style={{
        background: "white",
        padding: 16,
        borderRadius: 10,
        border: "1px solid #e1eae3",
      }}>
        <div style={{ fontSize: 12, color: "#66776b" }}>
          {item.label}
        </div>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#245c4a",
          marginTop: 8,
        }}>
          {item.count}
        </div>
      </div>
    ))}
  </div>
  <p style={{ fontSize: 11, color: "#77867c" }}>
    Counts are based on candidates added in the selected month.
    Unclassified candidates require review.
  </p>
</div>
 <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    label: "CANDIDATES ADDED",
                    value: candidates.length,
                    note: "Added during this month",
                  },
                  {
                    label: "ACTIVE PIPELINE",
                    value: ["Applied", "Screening", "Interview", "Shortlisted"]
                      .reduce((sum, stage) => sum + countStage(stage), 0),
                    note: "Currently in active stages",
                  },
                
{
  label: "HIRED SHARE",
  value: `${activeCandidates.length
    ? Math.round(
        (countStage("Hired") / activeCandidates.length) * 100
      )
    : 0}%`,
  note: "Hired candidates within Active Recruitment",
},

                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: "#f0f6f2",
                      border: "1px solid #dce9df",
                      borderTop: "3px solid #245c4a",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#66776b", fontWeight: 700 }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: "#245c4a", margin: "10px 0" }}>
                      {item.value}
                    </div>
                    <div style={{ fontSize: 11, color: "#77867c" }}>
                      {item.note}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: "#f7faf8",
                  border: "1px solid #dce9df",
                  borderLeft: "4px solid #245c4a",
                  borderRadius: 14,
                  padding: 22,
                  marginBottom: 25,
                  breakInside: "avoid",
                }}
              >
                <div
                  style={{
                    color: "#245c4a",
                    fontSize: 12,
                    fontWeight: 800,
                    letterSpacing: 1.5,
                    marginBottom: 12,
                  }}
                >
                  EXECUTIVE SUMMARY
                </div>

                <p
                  style={{
                    color: "#33443b",
                    fontSize: 14,
                    lineHeight: 1.9,
                    margin: 0,
                  }}
                >
                  
During {periodLabel}, a total of{" "}
<strong>{candidates.length} candidates</strong>{" "}
were added to the candidate database.
Of these,{" "}
<strong>{activeCandidates.length}</strong>{" "}
are in Active Recruitment,{" "}
<strong>
  {candidates.filter(
    c => c.recruitment_type === "Talent Pool"
  ).length}
</strong>{" "}
are in the Talent Pool, and{" "}
<strong>
  {candidates.filter(
    c => !c.recruitment_type
  ).length}
</strong>{" "}
remain unclassified.
Within Active Recruitment,{" "}
<strong>{countStage("Screening")}</strong>{" "}
are in screening,{" "}
<strong>{countStage("Shortlisted")}</strong>{" "}
are shortlisted, and{" "}
<strong>{countStage("Hired")}</strong>{" "}
are hired.

                </p>

                <div
                  style={{
                    marginTop: 14,
                    fontSize: 13,
                    color: "#245c4a",
                    fontWeight: 700,
                  }}
                >
                  
Screening Share:{" "}
{activeCandidates.length
  ? Math.round(
      (countStage("Screening") /
        activeCandidates.length) * 100
    )
  : 0}
%

                </div>
              </div>
              
              {(() => {
                const colors = [
                  "#173F3A",
                  "#347A65",
                  "#5DAA91",
                  "#9BCDBB",
                  "#D2A85F",
                  "#D97676",
                ];

                const chartData = stages.map((stage, index) => ({
                  name: stage,
                  count: countStage(stage),
                  color: colors[index],
                }));

                const tracked = chartData.reduce(
                  (sum, item) => sum + item.count,
                  0
                );

                
if (activeCandidates.length > tracked) {
  chartData.push({
    name: "Other",
    count: activeCandidates.length - tracked,
    color: "#94A3A0",
  });
}

let cumulative = 0;

const donutBackground = activeCandidates.length
  ? `conic-gradient(${chartData
      .filter((item) => item.count > 0)
      .map((item) => {
        const start =
          (cumulative / activeCandidates.length) * 100;

        cumulative += item.count;

        const end =
          (cumulative / activeCandidates.length) * 100;

        return `${item.color} ${start}% ${end}%`;
      })
      .join(", ")})`
  : "#E8F0EB";


                return (
                  <section
                    style={{
                      background: "#F8FBF9",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 24,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div style={{ marginBottom: 24 }}>
                      <div
                        style={{
                          color: "#347A65",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          marginBottom: 8,
                        }}
                      >
                        RECRUITMENT INTELLIGENCE
                      </div>

                      <h2
                        style={{
                          fontFamily: "Georgia, serif",
                          color: "#173F3A",
                          fontSize: 25,
                          margin: "0 0 8px",
                        }}
                      >
                        Pipeline Analytics
                      </h2>

                      <p
                        style={{
                          color: "#71847A",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        Current stages of candidates added in{" "}
                        {periodLabel}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: 20,
                      }}
                    >
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2ECE5",
                          borderRadius: 16,
                          padding: 22,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 16,
                            color: "#173F3A",
                            margin: "0 0 24px",
                          }}
                        >
                          Candidate Distribution
                        </h3>

                        <div
                          style={{
                            width: 210,
                            height: 210,
                            maxWidth: "100%",
                            borderRadius: "50%",
                            background: donutBackground,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 25px",
                          }}
                        >
                          <div
                            style={{
                              width: 145,
                              height: 145,
                              borderRadius: "50%",
                              background: "#FFFFFF",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 38,
                                color: "#173F3A",
                              }}
                            >
              {activeCandidates.length}
                            </strong>
                            <span
                              style={{
                                fontSize: 12,
                                color: "#71847A",
                              }}
                            >
                              Candidates
                            </span>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(2, minmax(0, 1fr))",
                            gap: 12,
                          }}
                        >
                          {chartData.map((item) => (
                            <div
                              key={item.name}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 12,
                              }}
                            >
                              <span
                                style={{
                                  width: 11,
                                  height: 11,
                                  flexShrink: 0,
                                  borderRadius: 4,
                                  background: item.color,
                                }}
                              />
                              <span style={{ color: "#52665A" }}>
                                {item.name}: {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2ECE5",
                          borderRadius: 16,
                          padding: 22,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 16,
                            color: "#173F3A",
                            margin: "0 0 25px",
                          }}
                        >
                          Hiring Stage Breakdown
                        </h3>

                        {chartData.map((item) => {
                          
const percentage = activeCandidates.length
  ? (item.count / activeCandidates.length) * 100
  : 0;


                          return (
                            <div
                              key={item.name}
                              style={{ marginBottom: 19 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  marginBottom: 9,
                                  fontSize: 12,
                                }}
                              >
                                <strong
                                  style={{ color: "#415A4C" }}
                                >
                                  {item.name}
                                </strong>

                                <span
                                  style={{ color: "#71847A" }}
                                >
                                  {item.count} ·{" "}
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>

                              <div
                                style={{
                                  height: 11,
                                  width: "100%",
                                  background: "#EDF3EF",
                                  borderRadius: 20,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${percentage}%`,
                                    background: item.color,
                                    borderRadius: 20,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <p
                          style={{
                            color: "#84938A",
                            fontSize: 11,
                            marginTop: 20,
                          }}
                        >
                          Based on current candidate status,
                          not historical conversion rates.
                        </p>
                      </div>
                    </div>
                  </section>
                );
              })()}


             
              {(() => {
                const daysInMonth = new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5, 7)),
                  0
                ).getDate();

                const weeks = Array.from(
                  { length: Math.ceil(daysInMonth / 7) },
                  (_, index) => ({
                    label: `Week ${index + 1}`,
                    range: `${index * 7 + 1}–${Math.min(
                      (index + 1) * 7,
                      daysInMonth
                    )}`,
                    count: 0,
                  })
                );

                candidates.forEach((candidate) => {
                  if (!candidate.created_at) return;

                  const date = new Date(candidate.created_at);
                  if (Number.isNaN(date.getTime())) return;

                  const weekIndex = Math.floor(
                    (date.getDate() - 1) / 7
                  );

                  if (weeks[weekIndex]) {
                    weeks[weekIndex].count += 1;
                  }
                });

                const maxCount = Math.max(
                  1,
                  ...weeks.map((week) => week.count)
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div style={{ marginBottom: 25 }}>
                      <div
                        style={{
                          color: "#347A65",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 2,
                          marginBottom: 9,
                        }}
                      >
                        TALENT ACQUISITION TRENDS
                      </div>

                      <h2
                        style={{
                          fontFamily: "Georgia, serif",
                          color: "#173F3A",
                          fontSize: 25,
                          margin: "0 0 8px",
                        }}
                      >
                        Weekly Candidate Growth
                      </h2>

                      <p
                        style={{
                          color: "#71847A",
                          fontSize: 13,
                          margin: 0,
                        }}
                      >
                        New candidates added each week in {periodLabel}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
                        gap: 12,
                        padding: "10px 0",
                      }}
                    >
                      {weeks.map((week) => (
                        <div
                          key={week.label}
                          style={{ textAlign: "center", minWidth: 0 }}
                        >
                          <div
                            style={{
                              height: 190,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: 8,
                              borderBottom: "1px solid #DCE9DF",
                            }}
                          >
                            <strong
                              style={{
                                color: "#173F3A",
                                fontSize: 18,
                              }}
                            >
                              {week.count}
                            </strong>

                            <div
                              style={{
                                width: "65%",
                                maxWidth: 65,
                                height: `${
                                  (week.count / maxCount) * 145
                                }px`,
                                background:
                                  "linear-gradient(180deg, #65B596, #173F3A)",
                                borderRadius: "9px 9px 0 0",
                              }}
                            />
                          </div>

                          <div
                            style={{
                              fontWeight: 700,
                              color: "#173F3A",
                              fontSize: 13,
                              marginTop: 14,
                            }}
                          >
                            {week.label}
                          </div>

                          <div
                            style={{
                              color: "#819388",
                              fontSize: 11,
                              marginTop: 5,
                            }}
                          >
                            Days {week.range}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 16,
                      }}
                    >
                      Based on candidate creation dates in the
                      selected reporting month.
                    </p>
                  </section>
                );
              })()}

              
              {(() => {
                const hired = countStage("Hired");
                const rejected = countStage("Rejected");

                const inProgress = [
                  "Applied",
                  "Screening",
                  "Interview",
                  "Shortlisted",
                ].reduce(
                  (sum, stage) => sum + countStage(stage),
                  0
                );

                const decided = hired + rejected;
                const other = Math.max(
                  0,
         activeCandidates.length - hired - rejected - inProgress
                );

                const metrics = [
                  {
                    label: "HIRED CANDIDATES",
                    value: hired,
                    color: "#173F3A",
                  },
                  {
                    label: "IN PROGRESS",
                    value: inProgress,
                    color: "#347A65",
                  },
                  {
                    label: "FINAL DECISIONS",
                    value: decided,
                    color: "#D2A85F",
                  },
                  {
                    label: "POSITIVE DECISION SHARE",
                    value: decided
                      ? `${Math.round((hired / decided) * 100)}%`
                      : "—",
                    color: "#5DAA91",
                  },
                ];

                const outcomeMix = [
                  {
                    name: "In Progress",
                    count: inProgress,
                    color: "#347A65",
                  },
                  {
                    name: "Hired",
                    count: hired,
                    color: "#173F3A",
                  },
                  {
                    name: "Rejected",
                    count: rejected,
                    color: "#D97676",
                  },
                  {
                    name: "Other",
                    count: other,
                    color: "#A7B7AF",
                  },
                ];

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                        marginBottom: 10,
                      }}
                    >
                      HIRING INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        margin: "0 0 10px",
                      }}
                    >
                      Hiring Performance Overview
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 25,
                      }}
                    >
                      Current hiring outcomes for candidates
                      added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(165px, 1fr))",
                        gap: 14,
                        marginBottom: 30,
                      }}
                    >
                      {metrics.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            background: "#F7FAF8",
                            border: "1px solid #E2ECE5",
                            borderTop: `4px solid ${item.color}`,
                            borderRadius: 14,
                            padding: 20,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "#71847A",
                              fontWeight: 700,
                              minHeight: 30,
                            }}
                          >
                            {item.label}
                          </div>

                          <div
                            style={{
                              fontSize: 34,
                              fontWeight: 800,
                              color: item.color,
                              marginTop: 12,
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3
                      style={{
                        color: "#173F3A",
                        fontSize: 16,
                        marginBottom: 18,
                      }}
                    >
                      Hiring Outcome Mix
                    </h3>

                    <div
                      style={{
                        height: 26,
                        background: "#EDF3EF",
                        borderRadius: 12,
                        display: "flex",
                        overflow: "hidden",
                        marginBottom: 18,
                      }}
                    >
                      {outcomeMix.map((item) => (
                        <div
                          key={item.name}
                          title={`${item.name}: ${item.count}`}
                          style={{
                            width: `${
                             
activeCandidates.length
  ? (item.count / activeCandidates.length) * 100
  : 0

                            }%`,
                            height: "100%",
                            background: item.color,
                          }}
                        />
                      ))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 18,
                      }}
                    >
                      {outcomeMix.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            color: "#52665A",
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: item.color,
                            }}
                          />
                          {item.name}: {item.count}
                        </div>
                      ))}
                    </div>

                    <p
                      style={{
                        fontSize: 11,
                        color: "#819388",
                        marginTop: 20,
                      }}
                    >
                      Positive Decision Share = Hired /
                      (Hired + Rejected). This is a current
                      status indicator, not a historical
                      conversion or offer acceptance rate.
                    </p>
                  </section>
                );
              
              })()}

              {/* JOB PERFORMANCE ANALYTICS */}
              {(() => {
                const jobRows = jobs
                  .map((job) => {
                   const linked = activeCandidates.filter(
                      (candidate) =>
                        String(candidate.job_id || "") ===
                        String(job.id)
                    );

                    return {
                      id: job.id,
                      title: job.title || "Untitled Job",
                      total: linked.length,
                      hired: linked.filter(
                        (c) => c.status === "Hired"
                      ).length,
                      interview: linked.filter(
                        (c) => c.status === "Interview"
                      ).length,
                      shortlisted: linked.filter(
                        (c) => c.status === "Shortlisted"
                      ).length,
                    };
                  })
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8);

                const maxCount = Math.max(
                  1,
                  ...jobRows.map((job) => job.total)
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      JOB INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                      }}
                    >
                      Job Performance Analytics
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 26,
                      }}
                    >
                      Top 8 jobs by candidates added in {periodLabel}.
                    </p>

                    {jobRows.length === 0 ? (
                      <p style={{ color: "#819388" }}>
                        No jobs available for this company.
                      </p>
                    ) : (
                      jobRows.map((job) => (
                        <div
                          key={job.id}
                          style={{ marginBottom: 24 }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              marginBottom: 9,
                            }}
                          >
                            <strong
                              style={{
                                color: "#173F3A",
                                fontSize: 13,
                              }}
                            >
                              {job.title}
                            </strong>
                            <span
                              style={{
                                color: "#347A65",
                                fontWeight: 800,
                                fontSize: 13,
                              }}
                            >
                              {job.total} Candidates
                            </span>
                          </div>

                          <div
                            style={{
                              background: "#EDF3EF",
                              height: 16,
                              borderRadius: 10,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(job.total / maxCount) * 100}%`,
                                height: "100%",
                                background: "#347A65",
                                borderRadius: 10,
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 16,
                              marginTop: 10,
                              color: "#71847A",
                              fontSize: 12,
                            }}
                          >
                            <span>Interview: {job.interview}</span>
                            <span>Shortlisted: {job.shortlisted}</span>
                            <span>Hired: {job.hired}</span>
                          </div>
                        </div>
                      ))
                    )}

                    <p
                      style={{
                        marginTop: 20,
                        color: "#819388",
                        fontSize: 11,
                      }}
                    >
                      Based on current candidate statuses and
                      job-linked candidates in the selected month.
                    </p>
                  </section>
                );
              
              })()}

              {/* Pipeline Distribution & Bottlenecks */}
              {(() => {
                const activeStages = [
                  "Applied",
                  "Screening",
                  "Interview",
                  "Shortlisted",
                ];

                const stageRows = activeStages.map((stage) => ({
                  name: stage,
                  count: countStage(stage),
                }));

                const activeTotal = stageRows.reduce(
                  (sum, item) => sum + item.count,
                  0
                );

                const maxCount = Math.max(
                  0,
                  ...stageRows.map((item) => item.count)
                );

                const largestStage = stageRows.find(
                  (item) => item.count === maxCount
                );

                const recommendations = {
                  Applied: "Review new applications and prioritize initial screening.",
                  Screening: "Review screening decisions and move qualified candidates forward.",
                  Interview: "Follow up on interview feedback and pending decisions.",
                  Shortlisted: "Align with hiring managers on final selection and next steps.",
                };

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      RECRUITMENT INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        marginBottom: 10,
                      }}
                    >
                    Pipeline Distribution & Bottlenecks
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 24,
                      }}
                    >
                      Identify where active candidates are concentrated
                      during {periodLabel}.
                    </p>

                    {activeTotal === 0 ? (
                      <p style={{ color: "#819388" }}>
                        No active candidates available for this period.
                      </p>
                    ) : (
                      <>
                        <div
                          style={{
                            background: "#F2F8F4",
                            border: "1px solid #DCE9DF",
                            borderRadius: 14,
                            padding: 20,
                            marginBottom: 26,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#347A65",
                              letterSpacing: 1,
                            }}
                          >
                            LARGEST ACTIVE STAGE
                          </div>

                          <div
                            style={{
                              fontSize: 26,
                              fontWeight: 800,
                              color: "#173F3A",
                              marginTop: 10,
                            }}
                          >
                            {largestStage.name}
                          </div>

                          <div
                            style={{
                              fontSize: 13,
                              color: "#52665A",
                              marginTop: 6,
                            }}
                          >
                            {largestStage.count} of {activeTotal} active candidates
                            {" "}(
                            {Math.round(
                              (largestStage.count / activeTotal) * 100
                            )}
                            %)
                          </div>
                        </div>

                        {stageRows.map((item) => (
                          <div
                            key={item.name}
                            style={{ marginBottom: 22 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 8,
                                gap: 12,
                                fontSize: 13,
                              }}
                            >
                              <strong style={{ color: "#173F3A" }}>
                                {item.name}
                              </strong>

                              <span style={{ color: "#52665A" }}>
                                {item.count} candidates |{" "}
                                {Math.round(
                                  (item.count / activeTotal) * 100
                                )}
                                %
                              </span>
                            </div>

                            <div
                              style={{
                                height: 16,
                                background: "#EDF3EF",
                                borderRadius: 10,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${
                                    (item.count / Math.max(1, maxCount)) * 100
                                  }%`,
                                  background:
                                    item.name === largestStage.name
                                      ? "#D2A85F"
                                      : "#347A65",
                                  borderRadius: 10,
                                }}
                              />
                            </div>
                          </div>
                        ))}

                        <div
                          style={{
                            borderLeft: "4px solid #347A65",
                            background: "#F7FAF8",
                            borderRadius: 10,
                            padding: 18,
                            marginTop: 24,
                          }}
                        >
                          <strong style={{ color: "#173F3A" }}>
                            Recommended Action
                          </strong>

                          <p
                            style={{
                              color: "#52665A",
                              fontSize: 13,
                              lineHeight: 1.7,
                              marginBottom: 0,
                            }}
                          >
                            {recommendations[largestStage.name]}
                          </p>
                        </div>
                      </>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 22,
                      }}
                    >
                      This analysis highlights candidate concentration
                      by current stage. A confirmed process bottleneck
                      requires stage entry dates and time-in-stage data.
                    </p>
                  </section>
                );
              
              })()}

              {/* RECRUITMENT DATA QUALITY SCORE */}
              {(() => {
                
const total = activeCandidates.length;

const linked = activeCandidates.filter((candidate) =>
  jobs.some(
    (job) =>
      String(job.id) === String(candidate.job_id)
  )
).length;

const validStatus = activeCandidates.filter((candidate) =>
  stages.some(
    (stage) =>
      stage.toLowerCase() ===
      String(candidate.status || "").toLowerCase()
  )
).length;

const withTitle = activeCandidates.filter(
  (candidate) =>
    String(candidate.current_title || "").trim() !== ""
).length;


                const checks = [
                  { name: "Job Assignment", count: linked },
                  { name: "Pipeline Status", count: validStatus },
                  { name: "Candidate Job Title", count: withTitle },
                ];

                const score = total
                  ? Math.round(
                      (checks.reduce(
                        (sum, item) => sum + item.count,
                        0
                      ) /
                        (total * checks.length)) *
                        100
                    )
                  : null;

                const weakest = checks.reduce(
                  (lowest, item) =>
                    item.count < lowest.count ? item : lowest,
                  checks[0]
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      DATA INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                      }}
                    >
                      Recruitment Data Quality Score
                    </h2>

                    <p style={{ color: "#71847A", fontSize: 13 }}>
                      Data completeness for candidates added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: "#245C4A",
                        margin: "20px 0",
                      }}
                    >
                      {score === null ? "—" : `${score}%`}
                    </div>

                    {total === 0 ? (
                      <p style={{ color: "#71847A" }}>
                        No candidates available for this period.
                      </p>
                    ) : (
                      <>
                        {checks.map((item) => {
                          const percentage = Math.round(
                            (item.count / total) * 100
                          );

                          return (
                            <div
                              key={item.name}
                              style={{ marginBottom: 20 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  marginBottom: 8,
                                  fontSize: 13,
                                }}
                              >
                                <strong>{item.name}</strong>
                                <span>
                                  {item.count}/{total} ({percentage}%)
                                </span>
                              </div>

                              <div
                                style={{
                                  height: 12,
                                  background: "#EDF3EF",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${percentage}%`,
                                    height: "100%",
                                    background: "#347A65",
                                    borderRadius: 8,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        <div
                          style={{
                            background: "#F7FAF8",
                            borderLeft: "4px solid #D2A85F",
                            padding: 16,
                            borderRadius: 10,
                            marginTop: 22,
                            fontSize: 13,
                            color: "#52665A",
                          }}
                        >
                          <strong>Priority Improvement:</strong>{" "}
                          {weakest.name === "Job Assignment"
                            ? "Link candidates to their relevant jobs."
                            : weakest.name === "Pipeline Status"
                            ? "Review missing or unrecognized candidate statuses."
                            : "Complete missing candidate job titles."}
                        </div>
                      </>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 20,
                      }}
                    >
                      Score is the average completeness of three
                      fields: valid job assignment, pipeline status,
                      and candidate title. This is a data quality
                      indicator, not an AI prediction.
                    </p>
                  </section>
                );
              
              })()}

              {/* PIPELINE HEALTH SCORE */}
              {(() => {
          const total = activeCandidates.length;

                const applied = countStage("Applied");
                const screening = countStage("Screening");
                const interview = countStage("Interview");
                const shortlisted = countStage("Shortlisted");
                const hired = countStage("Hired");
                const rejected = countStage("Rejected");

                const active =
                  applied + screening + interview + shortlisted;

                const decided = hired + rejected;

                const decisionCoverage = total
                  ? Math.round((decided / total) * 100)
                  : 0;

                const progressionShare = active
                  ? Math.round(
                      ((interview + shortlisted) / active) * 100
                    )
                  : 0;

               const jobLinked = activeCandidates.filter((candidate) =>
                  jobs.some(
                    (job) =>
                      String(job.id) === String(candidate.job_id)
                  )
                ).length;

                const assignmentCoverage = total
                  ? Math.round((jobLinked / total) * 100)
                  : 0;

                const score = total
                  ? Math.round(
                      decisionCoverage * 0.3 +
                      progressionShare * 0.35 +
                      assignmentCoverage * 0.35
                    )
                  : null;

                const components = [
                  {
                    label: "Decision Coverage",
                    value: decisionCoverage,
                    weight: "30%",
                  },
                  {
                    label: "Advanced Stage Share",
                    value: progressionShare,
                    weight: "35%",
                  },
                  {
                    label: "Job Assignment Coverage",
                    value: assignmentCoverage,
                    weight: "35%",
                  },
                ];

                const priority = [...components].sort(
                  (a, b) => a.value - b.value
                )[0];

                const advice = {
                  "Decision Coverage":
                    "Review candidates awaiting final decisions and follow up with hiring managers.",
                  "Advanced Stage Share":
                    "Review screening outcomes and move suitable candidates toward interviews.",
                  "Job Assignment Coverage":
                    "Assign candidates to the correct job openings to improve reporting accuracy.",
                };

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                      breakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      PIPELINE INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        marginBottom: 10,
                      }}
                    >
                      Pipeline Health Score
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        marginBottom: 20,
                      }}
                    >
                      A weighted operational indicator for candidates
                      added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 24,
                        marginBottom: 26,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 54,
                          fontWeight: 800,
                          color: "#173F3A",
                        }}
                      >
                        {score === null ? "—" : `${score}/100`}
                      </div>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#52665A",
                          maxWidth: 360,
                          lineHeight: 1.7,
                        }}
                      >
                        {score === null
                          ? "No candidates available for this period."
                          : "A composite view of decisions, active-stage progression, and job assignment."}
                      </div>
                    </div>

                    {score !== null && (
                      <>
                        {components.map((item) => (
                          <div
                            key={item.label}
                            style={{ marginBottom: 20 }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 12,
                                fontSize: 13,
                                marginBottom: 8,
                              }}
                            >
                              <strong style={{ color: "#173F3A" }}>
                                {item.label}
                              </strong>

                              <span style={{ color: "#52665A" }}>
                                {item.value}% | Weight: {item.weight}
                              </span>
                            </div>

                            <div
                              style={{
                                height: 13,
                                background: "#EDF3EF",
                                borderRadius: 9,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${item.value}%`,
                                  height: "100%",
                                  background: "#347A65",
                                  borderRadius: 9,
                                }}
                              />
                            </div>
                          </div>
                        ))}

                        <div
                          style={{
                            background: "#F7FAF8",
                            borderLeft: "4px solid #D2A85F",
                            borderRadius: 10,
                            padding: 18,
                            marginTop: 24,
                          }}
                        >
                          <strong
                            style={{
                              color: "#173F3A",
                              fontSize: 13,
                            }}
                          >
                            Recommended Priority
                          </strong>

                          <p
                            style={{
                              color: "#52665A",
                              fontSize: 13,
                              lineHeight: 1.7,
                              marginBottom: 0,
                            }}
                          >
                            {advice[priority.label]}
                          </p>
                        </div>
                      </>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 22,
                      }}
                    >
                      This is a custom weighted operational score,
                      not a validated prediction of hiring success.
                      Stage history and time-to-hire data are not
                      included.
                    </p>
                  </section>
                );
              
              })()}

              {/* SMART RECRUITMENT ALERTS */}
              {(() => {
          const total = activeCandidates.length;
                const activeStages = [
                  "Applied",
                  "Screening",
                  "Interview",
                  "Shortlisted",
                ];

                const active = activeStages.reduce(
                  (sum, stage) => sum + countStage(stage),
                  0
                );

                const alerts = [];

                const missingJobs = candidates.filter(
                  (candidate) =>
                    !jobs.some(
                      (job) =>
                        String(job.id) === String(candidate.job_id)
                    )
                ).length;

               const missingTitles = activeCandidates.filter(
                  (candidate) =>
                    !String(candidate.current_title || "").trim()
                ).length;

         const unknownStatuses = activeCandidates.filter(
                  (candidate) =>
                    !stages.some(
                      (stage) =>
                        stage.toLowerCase() ===
                        String(candidate.status || "")
                          .trim()
                          .toLowerCase()
                    )
                ).length;

                

                if (
                  total >= 3 &&
                  missingTitles / total >= 0.25
                ) {
                  alerts.push({
                    level: "Medium",
                    title: "Incomplete Candidate Profiles",
                    detail: `${missingTitles} of ${total} candidates have no current job title.`,
                    action:
                      "Complete missing job titles to improve search, segmentation, and reporting.",
                  });
                }

                if (unknownStatuses > 0) {
                  alerts.push({
                    level: "High",
                    title: "Unrecognized Pipeline Status",
                    detail: `${unknownStatuses} candidate records have a missing or unrecognized pipeline status.`,
                    action:
                      "Review these records and update their recruitment stages.",
                  });
                }

                const screening = countStage("Screening");

                if (
                  active >= 3 &&
                  screening / active >= 0.4
                ) {
                  alerts.push({
                    level: "Medium",
                    title: "High Screening Concentration",
                    detail: `${screening} of ${active} active candidates (${Math.round(
                      (screening / active) * 100
                    )}%) are currently in Screening.`,
                    action:
                      "Review screening outcomes and identify candidates ready for the next stage.",
                  });
                }

                const interview = countStage("Interview");

                if (
                  active >= 3 &&
                  interview / active >= 0.5
                ) {
                  alerts.push({
                    level: "Medium",
                    title: "High Interview Concentration",
                    detail: `${interview} of ${active} active candidates are currently in Interview.`,
                    action:
                      "Check interview feedback and coordinate pending hiring decisions.",
                  });
                }

                alerts.sort(
                  (a, b) =>
                    (a.level === "High" ? 0 : 1) -
                    (b.level === "High" ? 0 : 1)
                );

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      RECRUITMENT INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                        marginBottom: 10,
                      }}
                    >
                      Smart Recruitment Alerts
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Automated operational alerts based on candidates
                      added in {periodLabel}.
                    </p>

                    <div
                      style={{
                        background: "#F7FAF8",
                        padding: 16,
                        borderRadius: 12,
                        margin: "20px 0",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: 28,
                          color: "#245C4A",
                        }}
                      >
                        {alerts.length}
                      </strong>
                      <span
                        style={{
                          marginLeft: 12,
                          color: "#52665A",
                          fontSize: 13,
                        }}
                      >
                        Alerts Detected
                      </span>
                    </div>

                    {total === 0 ? (
                      <p style={{ color: "#71847A" }}>
                        No candidates available for this period.
                      </p>
                    ) : alerts.length === 0 ? (
                      <div
                        style={{
                          background: "#F0F8F3",
                          border: "1px solid #D0E7D8",
                          padding: 20,
                          borderRadius: 12,
                          color: "#245C4A",
                          fontSize: 13,
                        }}
                      >
                        No alerts triggered by the current rules.
                        Continue monitoring recruitment data.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: 16,
                          marginTop: 20,
                        }}
                      >
                        {alerts.map((alert, index) => (
                          <div
                            key={`${alert.title}-${index}`}
                            style={{
                              border:
                                "1px solid #E2ECE5",
                              borderLeft: `5px solid ${
                                alert.level === "High"
                                  ? "#C35A4A"
                                  : "#D2A85F"
                              }`,
                              borderRadius: 12,
                              padding: 20,
                              background: "#FCFDFC",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 12,
                                flexWrap: "wrap",
                              }}
                            >
                              <strong
                                style={{
                                  color: "#173F3A",
                                  fontSize: 15,
                                }}
                              >
                                {alert.title}
                              </strong>

                              <span
                                style={{
                                  color:
                                    alert.level === "High"
                                      ? "#A64639"
                                      : "#956A20",
                                  fontSize: 11,
                                  fontWeight: 800,
                                }}
                              >
                                {alert.level} Priority
                              </span>
                            </div>

                            <p
                              style={{
                                color: "#52665A",
                                fontSize: 13,
                                lineHeight: 1.7,
                                marginTop: 12,
                              }}
                            >
                              {alert.detail}
                            </p>

                            <div
                              style={{
                                background: "#F1F6F2",
                                padding: 14,
                                borderRadius: 8,
                                fontSize: 12,
                                color: "#245C4A",
                                lineHeight: 1.7,
                              }}
                            >
                              <strong>Recommended Action:</strong>{" "}
                              {alert.action}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 22,
                        lineHeight: 1.7,
                      }}
                    >
                      Alerts are generated using transparent,
                      rule-based thresholds. High stage
                      concentration does not necessarily indicate
                      a delay. This feature is not yet powered
                      by a predictive AI model.
                    </p>
                  </section>
                );
              
              })()}

              {/* JOB-LEVEL INTELLIGENCE */}
              {(() => {
                const jobInsights = jobs
                  .map((job) => {
            const linked = activeCandidates.filter(
                      (candidate) =>
                        String(candidate.job_id || "") ===
                        String(job.id)
                    );

                    const count = (status) =>
                      linked.filter(
                        (candidate) =>
                          String(candidate.status || "")
                            .trim()
                            .toLowerCase() === status.toLowerCase()
                      ).length;

                    const total = linked.length;
                    const applied = count("Applied");
                    const screening = count("Screening");
                    const interview = count("Interview");
                    const shortlisted = count("Shortlisted");
                    const hired = count("Hired");

                    let insight = "Pipeline Activity";
                    let recommendation =
                      "Continue reviewing candidates and updating recruitment stages.";

                    if (total === 0) {
                      insight = "No New Candidates This Month";
                      recommendation =
                        "Review sourcing activity if this job is actively hiring.";
                    } else if (
                      total >= 3 &&
                      screening / total >= 0.5
                    ) {
                      insight = "Screening Concentration";
                      recommendation =
                        "Review screening decisions and identify candidates ready for interviews.";
                    } else if (
                      total >= 3 &&
                      applied / total >= 0.5
                    ) {
                      insight = "Application Review Priority";
                      recommendation =
                        "Prioritize initial application reviews and screening.";
                    } else if (
                      interview + shortlisted >= 2 &&
                      hired === 0
                    ) {
                      insight = "Candidates Awaiting Next Steps";
                      recommendation =
                        "Review interview feedback and coordinate next steps with the hiring manager.";
                    } else if (hired > 0) {
                      insight = "Hiring Outcome Recorded";
                      recommendation =
                        "Review remaining candidates and confirm whether further hiring is required.";
                    }

                    return {
                      id: job.id,
                      title: job.title || "Untitled Job",
                      total,
                      applied,
                      screening,
                      interview,
                      shortlisted,
                      hired,
                      insight,
                      recommendation,
                    };
                  })
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8);

                return (
                  <section
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #DCE9DF",
                      borderRadius: 18,
                      padding: 26,
                      marginBottom: 28,
                    }}
                  >
                    <div
                      style={{
                        color: "#347A65",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 2,
                      }}
                    >
                      JOB INTELLIGENCE
                    </div>

                    <h2
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#173F3A",
                        fontSize: 25,
                      }}
                    >
                      Job-Level Intelligence
                    </h2>

                    <p
                      style={{
                        color: "#71847A",
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Individual job analysis and recommended
                      actions for candidates added in {periodLabel}.
                    </p>

                    {jobInsights.length === 0 ? (
                      <p style={{ color: "#71847A" }}>
                        No jobs available for analysis.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
                          gap: 18,
                          marginTop: 24,
                        }}
                      >
                        {jobInsights.map((job) => (
                          <div
                            key={job.id}
                            style={{
                              background: "#F9FBF9",
                              border: "1px solid #E1EBE4",
                              borderRadius: 14,
                              padding: 20,
                              minWidth: 0,
                            }}
                          >
                            <h3
                              style={{
                                color: "#173F3A",
                                fontSize: 17,
                                marginTop: 0,
                              }}
                            >
                              {job.title}
                            </h3>

                            <div
                              style={{
                                fontSize: 30,
                                fontWeight: 800,
                                color: "#245C4A",
                              }}
                            >
                              {job.total}
                            </div>

                            <p
                              style={{
                                color: "#71847A",
                                fontSize: 12,
                              }}
                            >
                              Candidates added this month
                            </p>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 10,
                                fontSize: 12,
                                color: "#52665A",
                                marginBottom: 18,
                              }}
                            >
                              <span>Applied: {job.applied}</span>
                              <span>Screening: {job.screening}</span>
                              <span>Interview: {job.interview}</span>
                              <span>Shortlisted: {job.shortlisted}</span>
                              <span>Hired: {job.hired}</span>
                            </div>

                            <div
                              style={{
                                borderTop: "1px solid #DCE9DF",
                                paddingTop: 14,
                              }}
                            >
                              <strong
                                style={{
                                  color: "#245C4A",
                                  fontSize: 13,
                                }}
                              >
                                {job.insight}
                              </strong>

                              <p
                                style={{
                                  color: "#52665A",
                                  fontSize: 12,
                                  lineHeight: 1.7,
                                }}
                              >
                                {job.recommendation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p
                      style={{
                        color: "#819388",
                        fontSize: 11,
                        marginTop: 20,
                        lineHeight: 1.7,
                      }}
                    >
                      Insights use current statuses of candidates
                      created in the selected month. They do not
                      measure time in stage, historical conversion,
                      or actual hiring delays.
                    </p>
                  </section>
                );
              })()}

              <div






                style={{
                  breakBefore: "page",
                  pageBreakBefore: "always",
                  background: "#f7faf8",
                  border: "1px solid #dce9df",
                  borderLeft: "4px solid #245c4a",
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 18,
                }}
              >


                <div style={{
                  color: "#245c4a",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  marginBottom: 12,
                }}>
                  KEY RECRUITMENT INSIGHTS
                </div>

                <div style={{ fontSize: 13, lineHeight: 2, color: "#33443b" }}>
                  <div>
                    <strong>Pipeline Focus:</strong>{" "}
                    {countStage("Screening")} candidates are currently in screening.
                  </div>
                  <div>
                    <strong>Hiring Outcome:</strong>{" "}
                    {countStage("Hired")} {countStage("Hired") === 1 ? "candidate is" : "candidates are"} currently marked as hired.
                  </div>
                  <div>
                    <strong>Interview Readiness:</strong>{" "}

{countStage("Interview") === 0
  ? `No interviews are currently scheduled in the pipeline. Recommended Action: Review the ${countStage("Screening")} candidates in screening and identify those ready for interviews.`
  : `${countStage("Interview")} candidates are currently in the interview stage. Recommended Action: Follow up on interview feedback and next steps.`}

                  </div>

                 
              </div>
</div>
              <h3
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 21,
                  marginBottom: 15,
                
              }}
>
                Candidate Details
              </h3>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr style={{ background: "#eaf2ed" }}>
                      {[
                        "Candidate Name",
                        "Current Title",
                        "Pipeline Status",
                        "Date Added",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            textAlign: "left",
                            padding: 12,
                            borderBottom:
                              "2px solid #dce9df",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.full_name || "Unnamed"}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.current_title || "—"}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.status || "—"}
                        </td>

                        <td
                          style={{
                            padding: 12,
                            borderBottom: "1px solid #eee",
                          }}
                        >
                          {candidate.created_at
                            ? new Date(
                                candidate.created_at
                              ).toLocaleDateString("en-GB")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {candidates.length === 0 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: "#777",
                      padding: 20,
                    }}
                  >
                    No candidates were added during this month.
                  </p>
                )}
              </div>
            </>
          )}

          <div
            style={{
              borderTop: "1px solid #eee",
              marginTop: 30,
              paddingTop: 15,
              color: "#888",
              fontSize: 11,
            }}
          >
            Generated by Inspire Match ATS
            <div style={{ marginTop: 5 }}>
              Hire Better. Inspire More.
            </div>
            <div style={{ marginTop: 8 }}>
              This report groups candidates added in the
              selected month by their current pipeline status.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
