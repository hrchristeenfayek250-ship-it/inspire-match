"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const ACCEPT = ".pdf,.docx,.txt";
const CONCURRENCY = 3;

function verdictFor(overall, mustFail) {
  if (overall >= 75 && !mustFail)
    return { label: "Strong fit", cls: "strong" };

  if (overall >= 55)
    return { label: "Potential", cls: "potential" };

  return { label: "Not a fit", cls: "no" };
}

function computeOverall(scores = [], criteria = []) {
  let total = 0;
  let weightTotal = 0;
  let mustFail = false;

  for (const criterion of criteria) {
    const score =
      scores.find((item) => item.id === criterion.id)?.score ?? 0;

    const weight = Number(criterion.weight || 0);

    total += score * weight;
    weightTotal += weight;

    if (
      criterion.importance === "must" &&
      score < 40
    ) {
      mustFail = true;
    }
  }

  const overall = weightTotal
    ? Math.round(total / weightTotal)
    : 0;

  return {
    overall,
    mustFail,
    verdict: verdictFor(overall, mustFail),
  };
}

function candidateLabel(result) {
  return String(result.candidate?.name || "").trim() || "Name Not Available";
}
function ScoreRing({ value }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="ring"
      aria-label={`Match score ${value} percent`}
    >
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke="var(--sand)"
          strokeWidth="5"
        />

        <circle
          cx="38"
          cy="38"
          r={radius}
          fill="none"
          stroke={
            value >= 75
              ? "var(--green)"
              : value >= 55
              ? "var(--copper)"
              : "var(--sage)"
          }
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={
            circumference * (1 - value / 100)
          }
        />
      </svg>

      <span className="num">
        {value}
        <sup>%</sup>
      </span>
    </div>
  );
}

function DropZone({
  multiple,
  onFiles,
  children,
}) {
  const input = useRef(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`drop${over ? " over" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          input.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles([...e.dataTransfer.files]);
      }}
    >
      {children}

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        hidden
        onChange={(e) => {
          onFiles([...e.target.files]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function Home() {
  /* =========================
     SAVED JOBS
  ========================= */

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] =
    useState("");

  const [loadingJobs, setLoadingJobs] =
    useState(false);

  async function loadJobs() {
    setLoadingJobs(true);

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Could not load jobs:",
        error
      );
    } else {
      setJobs(data || []);
    }

    setLoadingJobs(false);
  }

  useEffect(() => {
    loadJobs();
  }, []);

  /* =========================
     JOB DESCRIPTION
  ========================= */

  const [jdMode, setJdMode] =
    useState("upload");

  const [jdFile, setJdFile] =
    useState(null);

  const [jdText, setJdText] =
    useState("");

  const [jd, setJd] =
    useState(null);

  const [criteria, setCriteria] =
    useState([]);

  const [jdLoading, setJdLoading] =
    useState(false);

  const [jdError, setJdError] =
    useState("");

  function jobToText(job) {
    if (!job) return "";

    return `
JOB TITLE:
${job.title || ""}

DEPARTMENT:
${job.department || ""}

LOCATION:
${job.location || ""}

WORK TYPE:
${job.work_type || ""}

EMPLOYMENT TYPE:
${job.employment_type || ""}

SALARY:
${job.salary_proposed || ""}

YEARS OF EXPERIENCE:
${job.years_of_experience || ""}

HIRING MANAGER:
${job.hiring_manager || ""}

NUMBER OF OPENINGS:
${job.openings || ""}

PRIORITY:
${job.priority || ""}

HIRING DEADLINE:
${job.deadline || ""}

REQUIRED SKILLS:
${job.required_skills || ""}

NICE TO HAVE:
${job.nice_to_have_requirements || ""}

CANDIDATE REQUIREMENTS:
${job.requirements || ""}

KEY RESPONSIBILITIES:
${job.responsibilities || ""}

BENEFITS & PERKS:
${job.benefits || ""}

FULL JOB DESCRIPTION:
${job.description || ""}
`.trim();
  }

  function selectSavedJob(id) {
    setSelectedJobId(id);

    const job = jobs.find(
      (item) => String(item.id) === String(id)
    );

    if (!job) return;

    setJdText(jobToText(job));
    setJdFile(null);
    setJdMode("paste");
    setJd(null);
    setCriteria([]);
    setJdError("");
    setResults([]);
  }

  async function readJD() {
    setJdLoading(true);
    setJdError("");

    try {
      const fd = new FormData();

      if (jdMode === "upload" && jdFile) {
        fd.append("file", jdFile);
      } else {
        fd.append("text", jdText);
      }

      const res = await fetch(
        "/api/analyze-jd",
        {
          method: "POST",
          body: fd,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Could not read the job description."
        );
      }

      setJd(data);
      setCriteria(data.criteria || []);
      setResults([]);
    } catch (error) {
      setJdError(error.message);
    } finally {
      setJdLoading(false);
    }
  }

  /* =========================
     CVS
  ========================= */

  const [cvFiles, setCvFiles] =
    useState([]);

  
  

  const [consent, setConsent] =
    useState(false);

  const [scoring, setScoring] =
    useState(false);

  /* =========================
     RESULTS
  ========================= */

  const [results, setResults] =
    useState([]);

  const [openKey, setOpenKey] =
    useState(null);

  const [selected, setSelected] =
    useState({});

  const [clientName, setClientName] =
    useState("");
  /* =========================
     SAVE CANDIDATE
  ========================= */

  async function saveCandidate(

    result,
    fileName
  ) {
    const candidate =
      result?.candidate || {};

    const scoring = computeOverall(
      result?.scores || [],
      criteria
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "You must be logged in to save a candidate."
      );
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipError || memberships?.length !== 1) {
      throw new Error(
        "Please select or set up your company first."
      );
    }

    const companyId = memberships[0].company_id;

    const { error } = await supabase
      .from("candidates")
      .insert([
        {
          user_id: user.id,
          
company_id: companyId,


job_id: selectedJobId ? Number(selectedJobId) : null,

 
          full_name:
            candidate.name?.trim() || null,

          email:
            candidate.email?.trim() || null,

          phone:
            candidate.phone?.trim() || null,

          linkedin_url:
            candidate.linkedinUrl?.trim() || null,

          location:
            candidate.location || null,


          current_title:
            candidate.currentTitle ||
            null,

          
          years_experience:
            candidate.yearsExperience ?? null,

          skills:
            Array.isArray(candidate.skills)
              ? candidate.skills
                  .filter((skill) => typeof skill === "string" && skill.trim())
                  .join(", ") || null
              : typeof candidate.skills === "string"
                ? candidate.skills.trim() || null
                : null,

          professional_summary:
            typeof candidate.summary === "string"
              ? candidate.summary.trim() || null
              : null,

          cv_file_name:
            fileName || null,


          consent_confirmed: true,

          status: "Applied",

          source: "Inspire Match",

          match_score:
            scoring.overall,

          match_verdict:
            scoring.verdict.label,

          matched_job_title:
            jd?.title || null,

          ai_summary:
            result?.summary || null,

          strengths:
            result?.strengths || [],

          gaps:
            result?.gaps || [],

          red_flags:
            result?.redFlags || [],

          interview_questions:
            result?.interviewQuestions || [],
        },
      ]);

    if (error) {
      throw new Error(
        `Could not save candidate: ${error.message}`
      );
    }
  }
  /* =========================
     CRITERIA
  ========================= */

  function updateCriterion(
    id,
    patch
  ) {
    setCriteria((current) =>
      current.map((criterion) =>
        criterion.id === id
          ? {
              ...criterion,
              ...patch,
            }
          : criterion
      )
    );
  }

  const weightTotal = criteria.reduce(
    (sum, criterion) =>
      sum +
      Number(criterion.weight || 0),
    0
  );

  /* =========================
     CV UPLOAD
  ========================= */

  function addCvs(files) {
    const valid = files.filter((file) =>
      /\.(pdf|docx|txt)$/i.test(
        file.name
      )
    );

    setCvFiles((current) => {
      const names = new Set(
        current.map(
          (file) =>
            file.name + file.size
        )
      );

      return [
        ...current,
        ...valid.filter(
          (file) =>
            !names.has(
              file.name + file.size
            )
        ),
      ];
    });
  }

  /* =========================
     AI SCORING
  ========================= */

  async function scoreAll() {
    setScoring(true);

    const queue = cvFiles.map(
      (file, index) => ({
        file,
        index,
      })
    );

    setResults(
      queue.map(({ file, index }) => ({
        key: `${index}-${file.name}`,
        index,
        fileName: file.name,
        status: "pending",
      }))
    );

    setSelected({});

    const update = (
      index,
      patch
    ) => {
      setResults((current) =>
        current.map((result) =>
          result.index === index
            ? {
                ...result,
                ...patch,
              }
            : result
        )
      );
    };

    const jdForApi = {
      ...jd,
      criteria,
    };

    let next = 0;

    const worker = async () => {
      while (next < queue.length) {
        const {
          file,
          index,
        } = queue[next++];

        update(index, {
          status: "scoring",
        });

        try {
          const fd =
            new FormData();

          fd.append("cv", file);

          fd.append(
            "jd",
            JSON.stringify(
              jdForApi
            )
          );

          const res =
            await fetch(
              "/api/score-cv",
              {
                method: "POST",
                body: fd,
              }
            );

          const data =
            await res.json();

          if (!res.ok) {
            throw new Error(
              data.error ||
                "Scoring failed."
            );
          }

          update(index, {
            status: "done",
            ...data,
          });

          await saveCandidate(
            data,
            file.name
          );
        } catch (error) {
          update(index, {
            status: "error",
            error:
              error.message,
          });
        }
      }
    };

    await Promise.all(
      Array.from(
        {
          length:
            CONCURRENCY,
        },
        worker
      )
    );

    setScoring(false);
  }

  /* =========================
     RANKING
  ========================= */

  const ranked = useMemo(
    () =>
      results
        .filter(
          (result) =>
            result.status ===
            "done"
        )
        .map((result) => ({
          ...result,
          ...computeOverall(
            result.scores,
            criteria
          ),
        }))
        .sort(
          (a, b) =>
            b.overall -
            a.overall
        ),
    [
      results,
      criteria,
    ]
  );

  const unfinished =
    results.filter(
      (result) =>
        result.status !==
        "done"
    );

  const doneCount =
    results.filter(
      (result) =>
        result.status ===
          "done" ||
        result.status ===
          "error"
    ).length;

  const shortlist =
    ranked
      .filter(
        (result) =>
          selected[result.key] ??
          result.verdict.cls !==
            "no"
      )
      .slice(0, 10);

  /* =========================
     CSV
  ========================= */

  function downloadCsv() {
    const escape = (value) =>
      `"${String(
        value ?? ""
      ).replace(
        /"/g,
        '""'
      )}"`;

    const headers = [
      "Rank",
      "Candidate",
      "File",
      "Current Title",
      "Years",
      "Location",
      "Match %",
      "Verdict",
      ...criteria.map(
        (criterion) =>
          criterion.name
      ),
      "Strengths",
      "Gaps",
      "Red Flags",
    ];

    const rows =
      ranked.map(
        (result, index) => [
          index + 1,

        candidateLabel(result),

          result.fileName,

          result.candidate
            ?.currentTitle,

          result.candidate
            ?.yearsExperience,

          result.candidate
            ?.location,

          result.overall,

          result.verdict
            .label,

          ...criteria.map(
            (criterion) =>
              result.scores?.find(
                (score) =>
                  score.id ===
                  criterion.id
              )?.score ?? ""
          ),

          (
            result.strengths ||
            []
          ).join("; "),

          (
            result.gaps ||
            []
          ).join("; "),

          (
            result.redFlags ||
            []
          ).join("; "),
        ]
      );

   <header className="im-home-topbar">
  <div className="im-topbar-search">
    <span>⌕</span>
    <input
      type="search"
      placeholder="Search jobs, candidates, or keywords..."
      aria-label="Search"
    />
  </div>

  <div className="im-topbar-actions">
    <a
      href="/app/dashboard"
      className="im-topbar-dashboard"
    >
      Dashboard
    </a>

    <a
      href="/app/notifications"
      className="im-topbar-notifications"
      aria-label="Notifications"
    >
      ♧
    </a>

    <div className="im-topbar-profile">
      <span className="im-profile-avatar">CF</span>
      <span>My Workspace</span>
    </div>
  </div>
</header>

    const url =
      URL.createObjectURL(
        new Blob(
          [
            "\ufeff" +
              csv,
          ],
          {
            type:
              "text/csv;charset=utf-8",
          }
        )
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download = `${
      jd?.title ||
      "candidate-ranking"
    }-ranking.csv`;

    link.click();

    URL.revokeObjectURL(
      url
    );
  }

  const canReadJd =
    jdMode === "upload"
      ? !!jdFile
      : jdText.trim()
          .length > 50;

  const today =
    new Date().toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );

  /* =========================
     UI
  ========================= */

  return (
    <>
      <div className="app">
        {/* UNIFIED ATS NAVIGATION */}

        <aside className="im-home-sidebar">
          <a
            className="im-home-brand"
            href="/app/dashboard"
          >
            <span className="im-home-logo">✦</span>

            <span>
              <strong>Inspire Match</strong>
              <small>TALENT INTELLIGENCE</small>
            </span>
          </a>

          <div className="im-home-label">
            WORKSPACE
          </div>

          <ATSNavigation
            className="im-home-navigation"
          />

<div className="im-upgrade-card">
  <div className="im-upgrade-icon">✦</div>

  <h3>Unlock More Potential</h3>

  <p>
    Take your recruitment workflow to the next
    level with Inspire Match Pro.
  </p>

  <span className="im-upgrade-label">
    ✨ Pro Plan — Coming Soon
  </span>
</div>
         <a
  className="im-home-footer"
  href="https://hireandinspirebychristine.com/"
>
  Hire &amp; Inspire by Christine
</a>
        </aside>

       
<div className="im-home-content">

  <div className="im-home-mobile-nav">
    <ATSNavigation />
  </div>

  {/* PREMIUM WORKSPACE TOPBAR */}
  <header className="im-workspace-topbar">
   
<div className="im-workspace-heading">
  <span className="im-workspace-kicker">
    RECRUITMENT WORKSPACE
  </span>
  <h2>AI Shortlisting</h2>
</div>

<form
  className="im-topbar-search"
  action="/app/candidates"
  method="get"
>
  <span aria-hidden="true">⌕</span>
  <input
    type="search"
    name="search"
    placeholder="Search candidates..."
    aria-label="Search candidates"
    required
  />
  <button type="submit">Search</button>
</form>


    <div className="im-workspace-actions">
      <a
        className="im-workspace-overview"
        href="/app/dashboard"
      >
        Overview ↗
      </a>

      <div className="im-workspace-account">
        <span className="im-workspace-avatar">IM</span>
        <span className="im-workspace-account-name">
          Inspire Match
          <small>Talent Intelligence</small>
        </span>
      </div>
    </div>
  </header>

  <main>


          {/* INTRO */}
<section className="intro im-premium-hero">
  <div className="im-hero-copy">
    <span className="im-hero-eyebrow">
      AI-POWERED RECRUITMENT
    </span>

    <h1>AI Shortlisting Studio</h1>

    <p>
      Choose a saved job or add a job description,
      upload CVs, and get a ranked shortlist with
      AI-powered match scores, evidence and
      interview questions.
    </p>
  
    <div className="im-hero-features">
      <span>⚡ Faster Screening</span>
      <span>◎ Smarter Matches</span>
      <span>▥ Actionable Insights</span>
    </div>
  </div>


  <div className="im-hero-visual" aria-hidden="true">
    <div className="im-hero-cv im-hero-cv-back">
      <span>◉</span>
    </div>

    <div className="im-hero-cv im-hero-cv-front">
      <span>◉</span>
      <i />
      <i />
      <i />
    </div>

    <div className="im-hero-match">
      95% Match
    </div>
  </div>
</section>

          {/* STEP 1 */}

          <section className="step">

            <div
              className="step-num"
              aria-hidden
            >
              1
            </div>

            <div>

              <h2>
                Job description
              </h2>

              <div className="panel">

               
{/* JOB DESCRIPTION INPUT OPTIONS */}
<div className="im-jd-tabs im-jd-tabs-three">
  <button
    type="button"
    className={jdMode === "upload" ? "active" : ""}
    onClick={() => setJdMode("upload")}
  >
    <span>↑</span> Upload File
  </button>

  <button
    type="button"
    className={jdMode === "paste" ? "active" : ""}
    onClick={() => setJdMode("paste")}
  >
    <span>☷</span> Paste Text
  </button>

  <details className="im-saved-job-tab">
    <summary>▤ Use a Saved Job</summary>

    <div className="im-saved-job-dropdown">
      <label htmlFor="im-saved-job-select">
        Select a saved job
      </label>

      <select
        id="im-saved-job-select"
        value={selectedJobId}
        onChange={(e) => selectSavedJob(e.target.value)}
      >
        <option value="">
          {loadingJobs
            ? "Loading saved jobs..."
            : "Select a saved job..."}
        </option>

        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title}
            {job.location ? ` — ${job.location}` : ""}
          </option>
        ))}
      </select>

      {jobs.length === 0 && !loadingJobs && (
        <p className="hint">
          No saved jobs yet. Create one from the Jobs page.
        </p>
      )}
    </div>
  </details>
</div>

<div className="im-jd-layout">
  <div className="im-jd-upload-area">
                {jdMode ===
                "upload" ? (
                  <DropZone
                    multiple={false}
                    onFiles={(files) =>
                      files[0] &&
                      setJdFile(
                        files[0]
                      )
                    }
                  >
                    <div className="im-upload-inner">
  <span className="im-upload-icon">⇧</span>
  <strong>
    {jdFile
      ? jdFile.name
      : "Drop your job description here"}
  </strong>
  <small>PDF, DOCX or TXT · Up to 4 MB</small>
  <span className="im-upload-button">
    {jdFile ? "Change File" : "Choose File"}
  </span>
</div>
                  </DropZone>
                ) : (
                  <textarea
                    value={jdText}
                    onChange={(e) =>
                      setJdText(
                        e.target
                          .value
                      )
                    }
                    placeholder="Paste the full job description here"
                    aria-label="Job description text"
                    rows={12}
                  />
                )}
  </div>

  <aside className="im-jd-tips">
    <div className="im-tips-icon">✦</div>

    <h3>Tips for better results</h3>

    <p>
      A detailed job description helps our AI
      understand what makes a great candidate.
    </p>

    <ul>
      <li>Include key responsibilities</li>
      <li>List required skills and experience</li>
      <li>Specify seniority and qualifications</li>
      <li>Add preferred skills if relevant</li>
    </ul>

    <div className="im-tips-formats">
      Supported formats: PDF · DOCX · TXT
    </div>
  </aside>
</div>
                <div className="row">

                  <button
                    className="btn"
                    onClick={
                      readJD
                    }
                    disabled={
                      !canReadJd ||
                      jdLoading
                    }
                  >
                    {jdLoading
                      ? "Reading the job description…"
                      : jd
                      ? "Read again"
                      : "Read job description"}
                  </button>

                </div>

                {jdError && (
                  <p className="error">
                    {jdError}
                  </p>
                )}

                {/* AI ANALYZED JD */}

                {jd && (
                  <div
                    style={{
                      marginTop:
                        "24px",
                    }}
                  >

                    <div className="jd-head">

                      <div>

                        <h3>
                          {jd.title}
                        </h3>

                        <div className="jd-meta">
                          {[
                            jd.company,
                            jd.seniority,
                            jd.location,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ", "
                            )}
                        </div>

                      </div>

                    </div>

                    <p
                      style={{
                        margin:
                          "10px 0 0",
                      }}
                    >
                      {jd.summary}
                    </p>

                    <div className="table-wrap">

                      <table className="criteria">

                        <thead>
                          <tr>
                            <th>
                              Criterion
                            </th>
                            <th>
                              What good
                              looks like
                            </th>
                            <th>
                              Type
                            </th>
                            <th>
                              Weight %
                            </th>
                            <th />
                          </tr>
                        </thead>

                        <tbody>

                          {criteria.map(
                            (criterion) => (
                              <tr
                                key={
                                  criterion.id
                                }
                              >

                                <td>
                                  <strong>
                                    {
                                      criterion.name
                                    }
                                  </strong>
                                </td>

                                <td className="detail">
                                  {
                                    criterion.detail
                                  }
                                </td>

                                <td>

                                  <button
                                    className={`pill${
                                      criterion.importance ===
                                      "must"
                                        ? " must"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      updateCriterion(
                                        criterion.id,
                                        {
                                          importance:
                                            criterion.importance ===
                                            "must"
                                              ? "nice"
                                              : "must",
                                        }
                                      )
                                    }
                                  >
                                    {criterion.importance ===
                                    "must"
                                      ? "Must-have"
                                      : "Nice-to-have"}
                                  </button>

                                </td>

                                <td>

                                  <input
                                    className="weight"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={
                                      criterion.weight
                                    }
                                    onChange={(
                                      e
                                    ) =>
                                      updateCriterion(
                                        criterion.id,
                                        {
                                          weight:
                                            Math.max(
                                              0,
                                              Number(
                                                e
                                                  .target
                                                  .value
                                              )
                                            ),
                                        }
                                      )
                                    }
                                  />

                                </td>

                                <td>

                                  <button
                                    className="pill"
                                    onClick={() =>
                                      setCriteria(
                                        (
                                          current
                                        ) =>
                                          current.filter(
                                            (
                                              item
                                            ) =>
                                              item.id !==
                                              criterion.id
                                          )
                                      )
                                    }
                                  >
                                    Remove
                                  </button>

                                </td>

                              </tr>
                            )
                          )}

                        </tbody>

                      </table>

                    </div>

                    <p
                      className={`total${
                        weightTotal !==
                        100
                          ? " off"
                          : ""
                      }`}
                    >
                      Total weight:{" "}
                      {weightTotal}%
                    </p>

                    <p className="hint">
                      Change weights any
                      time. Ranking updates
                      automatically.
                    </p>

                  </div>
                )}

              </div>

            </div>

          </section>

          {/* STEP 2 */}

          <section
            className={`step${
              jd ? "" : " locked"
            }`}
            aria-disabled={!jd}
          >

            <div
              className="step-num"
              aria-hidden
            >
              2
            </div>

            <div>

              <h2>
                CVs
              </h2>

              <div className="panel">
<div className="im-cv-layout">
  <div className="im-cv-upload-area">
                              <DropZone
                  multiple
                  onFiles={addCvs}
                >
                  <div className="im-upload-inner">
                    <span className="im-upload-icon">♧</span>

                    <strong>
                      Drop candidate CVs here
                    </strong>

                    <small>
                      Upload multiple CVs · PDF, DOCX or TXT · 4 MB each
                    </small>

                    <span className="im-upload-button">
                      Upload CVs
                    </span>

                    <span className="im-upload-count">
                      {cvFiles.length} CVs selected
                    </span>
                  </div>
                </DropZone>
  </div>

  <aside className="im-cv-tips">
    <div className="im-tips-icon">✦</div>

    <h3>Upload candidate resumes</h3>

    <p>
      Add multiple candidate CVs and let Inspire Match
      analyze their suitability for the role.
    </p>

    <ul>
      <li>Upload multiple CVs at once</li>
      <li>Use PDF, DOCX or TXT files</li>
      <li>Maximum 4 MB per file</li>
      <li>Review selected files before analysis</li>
    </ul>

    <div className="im-tips-formats">
      AI-powered candidate shortlisting
    </div>
  </aside>
</div>
                {cvFiles.length >
                  0 && (
                  <ul className="file-list">

                    {cvFiles.map(
                      (file, index) => (
                        <li
                          key={
                            file.name +
                            file.size
                          }
                        >

                          <span>
                            {file.name}
                          </span>

                          <button
                            onClick={() =>
                              setCvFiles(
                                (
                                  current
                                ) =>
                                  current.filter(
                                    (
                                      _,
                                      i
                                    ) =>
                                      i !==
                                      index
                                  )
                              )
                            }
                          >
                            Remove
                          </button>

                        </li>
                      )
                    )}

                  </ul>
                )}

              
{/* CONSENT & AI SHORTLISTING ACTION */}
<div className="im-shortlisting-action">
  <label className="im-shortlisting-consent">
    <input
      type="checkbox"
      checked={consent}
      onChange={(e) => setConsent(e.target.checked)}
    />

    <span>
      I confirm these candidates shared their CVs
      for this hiring process.
      <small>
        Candidate information will be used for
        recruitment screening.
      </small>
    </span>
  </label>

  <button
    type="button"
    className="im-run-ai-button"
    onClick={scoreAll}
    disabled={
      !cvFiles.length ||
      !consent ||
      scoring ||
      !criteria.length
    }
  >
    <span className="im-run-ai-sparkle">✦</span>

    <span>
      {scoring
        ? `Analyzing ${doneCount} of ${results.length} CVs...`
        : "Run AI Shortlisting"}
    </span>

    <span aria-hidden="true">→</span>
  </button>
</div>

                {scoring && (
                  <div
                    className="progress"
                    aria-hidden
                  >
                    <span
                      style={{
                        width: `${
                          results.length
                            ? (doneCount /
                                results.length) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                )}

              </div>

            </div>

          </section>

          {/* STEP 3 */}

          {results.length >
            0 && (
            <section className="step">

              <div
                className="step-num"
                aria-hidden
              >
                3
              </div>

              <div>

                <h2>
                  Ranked shortlist
                </h2>

                <div className="results">

                  {ranked.map(
                    (
                      result,
                      index
                    ) => {

                      const open =
                        openKey ===
                        result.key;

                      const inReport =
                        selected[
                          result.key
                        ] ??
                        result.verdict
                          .cls !==
                          "no";

                      return (
                        <article
                          className="cand"
                          key={
                            result.key
                          }
                        >

                          <div
                            className="cand-top"
                            onClick={() =>
                              setOpenKey(
                                open
                                  ? null
                                  : result.key
                              )
                            }
                            role="button"
                            tabIndex={0}
                            aria-expanded={
                              open
                            }
                          >

                            <div className="rank">
                              {index +
                                1}
                            </div>

                            <ScoreRing
                              value={
                                result.overall
                              }
                            />

                            <div>
<div className="cand-name">
  {candidateLabel(result)}
</div>
                             
                              <div className="cand-sub">
                                {[
                                  result
                                    .candidate
                                    ?.currentTitle,

                                  result
                                    .candidate
                                    ?.yearsExperience !=
                                    null &&
                                    `${result.candidate.yearsExperience} yrs`,

                                  result
                                    .candidate
                                    ?.location,
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(
                                    ", "
                                  )}
                              </div>

                              <div className="cand-sub">
                                {
                                  result.summary
                                }
                              </div>

                            </div>

                            <span
                              className={`verdict ${result.verdict.cls}`}
                            >
                              {
                                result.verdict
                                  .label
                              }
                            </span>

                          </div>

                          {open && (
                            <div className="cand-body">

                              <div>

                                <h4>
                                  Score by
                                  criterion
                                </h4>

                                <div className="bars">

                                  {criteria.map(
                                    (
                                      criterion
                                    ) => {

                                      const score =
                                        result.scores?.find(
                                          (
                                            item
                                          ) =>
                                            item.id ===
                                            criterion.id
                                        );

                                      return (
                                        <div
                                          key={
                                            criterion.id
                                          }
                                          className={`bar-row${
                                            criterion.importance ===
                                            "must"
                                              ? " must"
                                              : ""
                                          }`}
                                        >

                                          <span>
                                            {
                                              criterion.name
                                            }
                                          </span>

                                          <div className="bar">
                                            <span
                                              style={{
                                                width: `${
                                                  score?.score ??
                                                  0
                                                }%`,
                                              }}
                                            />
                                          </div>

                                          <span>
                                            {
                                              score?.score ??
                                              "–"
                                            }
                                          </span>

                                          {score?.evidence && (
                                            <span className="evidence">
                                              {
                                                score.evidence
                                              }
                                            </span>
                                          )}

                                        </div>
                                      );
                                    }
                                  )}

                                </div>

                              </div>

                              <div className="cols">

                                <div>
                                  <h4>
                                    Strengths
                                  </h4>

                                  <ul>
                                    {(
                                      result.strengths ||
                                      []
                                    ).map(
                                      (
                                        item,
                                        key
                                      ) => (
                                        <li
                                          key={
                                            key
                                          }
                                        >
                                          {item}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>

                                <div>
                                  <h4>
                                    Gaps
                                  </h4>

                                  <ul>
                                    {(
                                      result.gaps ||
                                      []
                                    ).map(
                                      (
                                        item,
                                        key
                                      ) => (
                                        <li
                                          key={
                                            key
                                          }
                                        >
                                          {item}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>

                                <div>

                                  <h4>
                                    Red flags
                                  </h4>

                                  {result
                                    .redFlags
                                    ?.length ? (
                                    <ul className="flag">
                                      {result.redFlags.map(
                                        (
                                          item,
                                          key
                                        ) => (
                                          <li
                                            key={
                                              key
                                            }
                                          >
                                            {item}
                                          </li>
                                        )
                                      )}
                                    </ul>
                                  ) : (
                                    <p className="hint">
                                      None found.
                                    </p>
                                  )}

                                </div>

                              </div>

                              <div>

                                <h4>
                                  Interview
                                  questions
                                </h4>

                                <ul>
                                  {(
                                    result.interviewQuestions ||
                                    []
                                  ).map(
                                    (
                                      question,
                                      key
                                    ) => (
                                      <li
                                        key={
                                          key
                                        }
                                      >
                                        {
                                          question
                                        }
                                      </li>
                                    )
                                  )}
                                </ul>

                              </div>

                              <label className="check">

                                <input
                                  type="checkbox"
                                  checked={
                                    inReport
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    setSelected(
                                      (
                                        current
                                      ) => ({
                                        ...current,
                                        [result.key]:
                                          e
                                            .target
                                            .checked,
                                      })
                                    )
                                  }
                                />

                                <span>
                                  Include in
                                  client report
                                </span>

                              </label>

                              <p className="hint">
                                File:{" "}
                                {
                                  result.fileName
                                }
                              </p>

                            </div>
                          )}

                        </article>
                      );
                    }
                  )}

                  {unfinished.map(
                    (result) => (
                      <div
                        className="cand pending"
                        key={
                          result.key
                        }
                      >
                        {result.status ===
                        "error"
                          ? (
                            <span className="flag">
                              {
                                result.fileName
                              }
                              :{" "}
                              {
                                result.error
                              }
                            </span>
                          )
                          : `${result.fileName}: ${
                              result.status ===
                              "scoring"
                                ? "scoring…"
                                : "waiting"
                            }`}
                      </div>
                    )
                  )}

                </div>

                {/* CLIENT REPORT */}

                {ranked.length >
                  0 && (
                  <div
                    className="panel"
                    style={{
                      marginTop:
                        "20px",
                    }}
                  >

                    <h3
                      style={{
                        fontSize:
                          "18px",
                      }}
                    >
                      Share with the
                      client
                    </h3>

                    <p className="hint">
                      The report includes{" "}
                      {
                        shortlist.length
                      }{" "}
                      candidate
                      {shortlist.length ===
                      1
                        ? ""
                        : "s"}.
                    </p>

                    <input
                      value={
                        clientName
                      }
                      onChange={(e) =>
                        setClientName(
                          e.target
                            .value
                        )
                      }
                      placeholder="Client company name"
                      style={{
                        width:
                          "100%",
                        maxWidth:
                          "360px",
                        padding:
                          "9px 12px",
                        border:
                          "1px solid var(--line)",
                        borderRadius:
                          "8px",
                      }}
                    />

                    <div className="row">

                      <button
                        className="btn"
                        onClick={() =>
                          window.print()
                        }
                        disabled={
                          !shortlist.length
                        }
                      >
                        Export client
                        report
                      </button>

                      <button
                        className="btn ghost"
                        onClick={
                          downloadCsv
                        }
                      >
                        Download full
                        ranking (CSV)
                      </button>

                    </div>

                  </div>
                )}

              </div>

            </section>
          )}

        </main>
</div>
      </div>

      {/* PRINT REPORT */}

      <div className="report">

        <div className="report-head">

          <div className="wordmark">
            Hire{" "}
            <span className="amp">
              &amp;
            </span>{" "}
            Inspire
            <span className="by">
              by Christine
            </span>
          </div>

          <div className="tagline">
            HIRE BETTER. INSPIRE MORE.
          </div>

        </div>

        <h2>
          Candidate shortlist:{" "}
          {jd?.title}
        </h2>

        <p>
          {[
            clientName &&
              `Prepared for ${clientName}`,
            today,
          ]
            .filter(Boolean)
            .join(", ")}
        </p>

        <p>
          {jd?.summary}
        </p>

        {shortlist.map(
          (result, index) => (
            <div
              className="report-cand"
              key={
                result.key
              }
            >

              <div className="report-cand-top">

                <div>

                  <strong
                    style={{
                      fontSize:
                        "14px",
                    }}
                  >
                    {index + 1}.{" "}
                    {candidateLabel(result)}
                  </strong>

                  <div>
                    {[
                      result
                        .candidate
                        ?.currentTitle,

                      result
                        .candidate
                        ?.yearsExperience !=
                        null &&
                        `${result.candidate.yearsExperience} years`,
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ", "
                      )}
                  </div>

                </div>

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >

                  <div className="report-score">
                    {
                      result.overall
                    }
                    %
                  </div>

                  <div>
                    {
                      result.verdict
                        .label
                    }
                  </div>

                </div>

              </div>

              <p>
                {
                  result.summary
                }
              </p>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: "12px",
                }}
              >

                <div>

                  <strong>
                    Strengths
                  </strong>

                  <ul>
                    {(
                      result.strengths ||
                      []
                    ).map(
                      (
                        item,
                        key
                      ) => (
                        <li
                          key={
                            key
                          }
                        >
                          {item}
                        </li>
                      )
                    )}
                  </ul>

                </div>

                <div>

                  <strong>
                    Areas to explore
                  </strong>

                  <ul>
                    {(
                      result.gaps ||
                      []
                    ).map(
                      (
                        item,
                        key
                      ) => (
                        <li
                          key={
                            key
                          }
                        >
                          {item}
                        </li>
                                                         )
                  )}
                  </ul>

                </div>

              </div>

            </div>
          )
        )}

        <div className="report-foot">
          Prepared by Hire &amp; Inspire by
          Christine: Recruitment,
          Organization Development,
          Payroll Management.
          <br />
          Scores support, and never
          replace, recruiter judgement.
          <br />
          hireandinspirebychristine.com
          {" | "}
          hello@hireandinspirebychristine.com
        </div>

      </div>
    </>
  );
}
