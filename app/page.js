"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

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

function candidateLabel(result, blind) {
  if (blind || !result.candidate?.name) {
    return `Candidate ${String.fromCharCode(
      65 + (result.index % 26)
    )}`;
  }

  return result.candidate.name;
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

  const [blind, setBlind] =
    useState(false);

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

    const { error } = await supabase
      .from("candidates")
      .insert([
        {
          full_name:
            candidate.name || null,

          location:
            candidate.location || null,

          current_title:
            candidate.currentTitle ||
            null,

          years_experience:
            candidate.yearsExperience ??
            null,

          cv_file_name:
            fileName || null,

          consent_confirmed: true,

          blind_screening: blind,

          status: "Screening",

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

          fd.append(
            "blind",
            String(blind)
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

          candidateLabel(
            result,
            blind
          ),

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

    const csv = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map(escape)
          .join(",")
      )
      .join("\n");

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

        {/* HEADER */}

        <header className="topbar">
          <div className="topbar-inner">

            <a
              href="https://hireandinspirebychristine.com/"
              className="wordmark"
              style={{
                textDecoration:
                  "none",
              }}
            >
              Hire{" "}
              <span className="amp">
                &amp;
              </span>{" "}
              Inspire
              <span className="by">
                by Christine
              </span>
            </a>

            <div className="product">
              Inspire Match
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: "8px",
                marginTop:
                  "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <a
                href="/app/dashboard"
                style={{
                  textDecoration:
                    "none",
                  padding:
                    "8px 12px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid var(--line)",
                  background:
                    "#fff",
                  color:
                    "#222",
                  fontSize:
                    "13px",
                }}
              >
                Dashboard
              </a>

              <a
                href="/app/jobs"
                style={{
                  textDecoration:
                    "none",
                  padding:
                    "8px 12px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid var(--line)",
                  background:
                    "#fff",
                  color:
                    "#222",
                  fontSize:
                    "13px",
                }}
              >
                Jobs
              </a>

              <a
                href="/app/pipeline"
                style={{
                  textDecoration:
                    "none",
                  padding:
                    "8px 12px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid var(--line)",
                  background:
                    "#fff",
                  color:
                    "#222",
                  fontSize:
                    "13px",
                }}
              >
                Candidate Pipeline
              </a>

              <a
                href="/app/candidates"
                style={{
                  textDecoration:
                    "none",
                  padding:
                    "8px 12px",
                  borderRadius:
                    "8px",
                  border:
                    "1px solid var(--line)",
                  background:
                    "#fff",
                  color:
                    "#222",
                  fontSize:
                    "13px",
                }}
              >
                Candidate Database
              </a>
            </div>

          </div>
        </header>

        <main>

          {/* INTRO */}

          <section className="intro">
            <h1>
              Find the right people
              in the pile, in minutes.
            </h1>

            <p>
              Choose a saved job or
              add a job description,
              upload CVs, and get a
              ranked shortlist with
              AI-powered match scores,
              evidence and interview
              questions.
            </p>
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

                {/* SAVED JOB */}

                <div
                  style={{
                    marginBottom:
                      "22px",
                    padding:
                      "18px",
                    background:
                      "#faf9f6",
                    border:
                      "1px solid var(--line)",
                    borderRadius:
                      "12px",
                  }}
                >

                  <label
                    style={{
                      display:
                        "block",
                      fontWeight:
                        700,
                      marginBottom:
                        "8px",
                    }}
                  >
                    Use a Saved Job
                  </label>

                  <select
                    value={
                      selectedJobId
                    }
                    onChange={(e) =>
                      selectSavedJob(
                        e.target.value
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "12px",
                      borderRadius:
                        "8px",
                      border:
                        "1px solid #ddd",
                      background:
                        "#fff",
                    }}
                  >
                    <option value="">
                      {loadingJobs
                        ? "Loading saved jobs..."
                        : "Select a saved job..."}
                    </option>

                    {jobs.map(
                      (job) => (
                        <option
                          key={
                            job.id
                          }
                          value={
                            job.id
                          }
                        >
                          {job.title}
                          {job.location
                            ? ` — ${job.location}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>

                  {jobs.length ===
                    0 &&
                    !loadingJobs && (
                      <p
                        className="hint"
                        style={{
                          marginBottom:
                            0,
                        }}
                      >
                        No saved jobs
                        yet. Create one
                        from the Jobs page.
                      </p>
                    )}

                </div>

                {/* TABS */}

                <div
                  className="tabs"
                  role="group"
                >
                  <button
                    aria-pressed={
                      jdMode ===
                      "upload"
                    }
                    onClick={() =>
                      setJdMode(
                        "upload"
                      )
                    }
                  >
                    Upload file
                  </button>

                  <button
                    aria-pressed={
                      jdMode ===
                      "paste"
                    }
                    onClick={() =>
                      setJdMode(
                        "paste"
                      )
                    }
                  >
                    Paste text
                  </button>
                </div>

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
                    <strong>
                      {jdFile
                        ? jdFile.name
                        : "Drop the JD here or click to choose"}
                    </strong>

                    <small>
                      PDF, DOCX or TXT,
                      up to 4 MB
                    </small>
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

                <DropZone
                  multiple
                  onFiles={addCvs}
                >
                  <strong>
                    Drop CVs here or
                    click to choose
                  </strong>

                  <small>
                    PDF, DOCX or TXT,
                    up to 4 MB each
                  </small>
                </DropZone>

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

                <div
                  style={{
                    display:
                      "grid",
                    gap: "10px",
                    marginTop:
                      "16px",
                  }}
                >

                  <label className="check">

                    <input
                      type="checkbox"
                      checked={blind}
                      onChange={(e) =>
                        setBlind(
                          e.target
                            .checked
                        )
                      }
                    />

                    <span>
                      <strong>
                        Blind screening.
                      </strong>{" "}
                      Hide names and
                      personal details so
                      candidates are judged
                      on skills and experience.
                    </span>

                  </label>

                  <label className="check">

                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) =>
                        setConsent(
                          e.target
                            .checked
                        )
                      }
                    />

                    <span>
                      I confirm these
                      candidates shared their
                      CVs for this hiring
                      process.
                    </span>

                  </label>

                </div>

                <div className="row">

                  <button
                    className="btn"
                    onClick={
                      scoreAll
                    }
                    disabled={
                      !cvFiles.length ||
                      !consent ||
                      scoring ||
                      !criteria.length
                    }
                  >
                    {scoring
                      ? `Scoring ${doneCount} of ${results.length}…`
                      : `Score ${
                          cvFiles.length ||
                          ""
                        } CV${
                          cvFiles.length ===
                          1
                            ? ""
                            : "s"
                        }`}
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
                                {candidateLabel(
                                  result,
                                  blind
                                )}
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
                    {candidateLabel(
                      result,
                      blind
                    )}
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

