"use client";

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const ACCEPT = ".pdf,.docx,.txt";
const CONCURRENCY = 3;

function verdictFor(overall, mustFail) {
  if (overall >= 75 && !mustFail) return { label: "Strong fit", cls: "strong" };
  if (overall >= 55) return { label: "Potential", cls: "potential" };
  return { label: "Not a fit", cls: "no" };
}

// Overall score is calculated here (not by the AI) so changing a weight re-ranks instantly.
function computeOverall(scores = [], criteria) {
  let total = 0;
  let wsum = 0;
  let mustFail = false;
  for (const c of criteria) {
    const s = scores.find((x) => x.id === c.id)?.score ?? 0;
    total += s * c.weight;
    wsum += c.weight;
    if (c.importance === "must" && s < 40) mustFail = true;
  }
  const overall = wsum ? Math.round(total / wsum) : 0;
  return { overall, mustFail, verdict: verdictFor(overall, mustFail) };
}

function candidateLabel(r, blind) {
  if (blind || !r.candidate?.name) return `Candidate ${String.fromCharCode(65 + (r.index % 26))}${r.index >= 26 ? Math.floor(r.index / 26) : ""}`;
  return r.candidate.name;
}

function ScoreRing({ value }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" aria-label={`Match score ${value} percent`}>
      <svg width="76" height="76" viewBox="0 0 76 76">
        <circle cx="38" cy="38" r={r} fill="none" stroke="var(--sand)" strokeWidth="5" />
        <circle cx="38" cy="38" r={r} fill="none" stroke={value >= 75 ? "var(--green)" : value >= 55 ? "var(--copper)" : "var(--sage)"}
          strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <span className="num">{value}<sup>%</sup></span>
    </div>
  );
}

function DropZone({ multiple, onFiles, children }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop${over ? " over" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
    >
      {children}
      <input ref={input} type="file" accept={ACCEPT} multiple={multiple} hidden
        onChange={(e) => { onFiles([...e.target.files]); e.target.value = ""; }} />
    </div>
  );
}

export default function Home() {
  // Step 1 — job description
  const [jdMode, setJdMode] = useState("upload");
  const [jdFile, setJdFile] = useState(null);
  const [jdText, setJdText] = useState("");
  const [jd, setJd] = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [jdLoading, setJdLoading] = useState(false);
  const [jdError, setJdError] = useState("");

  // Step 2 — CVs
  const [cvFiles, setCvFiles] = useState([]);
  const [blind, setBlind] = useState(false);
  const [consent, setConsent] = useState(false);
  const [scoring, setScoring] = useState(false);

  // Step 3 — results
  const [results, setResults] = useState([]);
  const [openKey, setOpenKey] = useState(null);
  const [selected, setSelected] = useState({});
  const [clientName, setClientName] = useState("");

  const weightTotal = criteria.reduce((s, c) => s + Number(c.weight || 0), 0);

  async function readJD() {
    setJdLoading(true);
    setJdError("");
    try {
      const fd = new FormData();
      if (jdMode === "upload" && jdFile) fd.append("file", jdFile);
      else fd.append("text", jdText);
      const res = await fetch("/api/analyze-jd", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read the job description.");
      setJd(data);
      setCriteria(data.criteria);
      setResults([]);
    } catch (e) {
      setJdError(e.message);
    } finally {
      setJdLoading(false);
    }
  }

  function updateCriterion(id, patch) {
    setCriteria((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addCvs(files) {
    const ok = files.filter((f) => /\.(pdf|docx|txt)$/i.test(f.name));
    setCvFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...ok.filter((f) => !names.has(f.name + f.size))];
    });
  }

  async function scoreAll() {
    setScoring(true);
    const queue = cvFiles.map((file, index) => ({ file, index }));
    setResults(queue.map(({ file, index }) => ({ key: `${index}-${file.name}`, index, fileName: file.name, status: "pending" })));
    setSelected({});
    const update = (index, patch) => setResults((list) => list.map((r) => (r.index === index ? { ...r, ...patch } : r)));
    const jdForApi = { ...jd, criteria };

    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const { file, index } = queue[next++];
        update(index, { status: "scoring" });
        try {
          const fd = new FormData();
          fd.append("cv", file);
          fd.append("jd", JSON.stringify(jdForApi));
          fd.append("blind", String(blind));
          const res = await fetch("/api/score-cv", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Scoring failed.");
          update(index, { status: "done", ...data });
        } catch (e) {
          update(index, { status: "error", error: e.message });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setScoring(false);
  }

  const ranked = useMemo(
    () =>
      results
        .filter((r) => r.status === "done")
        .map((r) => ({ ...r, ...computeOverall(r.scores, criteria) }))
        .sort((a, b) => b.overall - a.overall),
    [results, criteria]
  );
  const unfinished = results.filter((r) => r.status !== "done");
  const doneCount = results.filter((r) => r.status === "done" || r.status === "error").length;

  const shortlist = ranked.filter((r) => selected[r.key] ?? r.verdict.cls !== "no").slice(0, 10);

  function downloadCsv() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Rank", "Candidate", "File", "Current title", "Years", "Match %", "Verdict", ...criteria.map((c) => c.name), "Strengths", "Gaps", "Red flags"];
    const rows = ranked.map((r, i) => [
      i + 1, candidateLabel(r, blind), r.fileName, r.candidate?.currentTitle, r.candidate?.yearsExperience, r.overall, r.verdict.label,
      ...criteria.map((c) => r.scores?.find((s) => s.id === c.id)?.score ?? ""),
      (r.strengths || []).join("; "), (r.gaps || []).join("; "), (r.redFlags || []).join("; "),
    ]);
    const csv = [head, ...rows].map((row) => row.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(jd?.title || "shortlist").replace(/\W+/g, "-")}-ranking.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const canReadJd = jdMode === "upload" ? !!jdFile : jdText.trim().length > 50;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <div className="app">
        <header className="topbar">
          <div className="topbar-inner">
            <a href="https://hireandinspirebychristine.com/" className="wordmark" style={{ textDecoration: "none" }}>Hire <span className="amp">&amp;</span> Inspire<span className="by">by Christine</span></a>
            <div className="product">Inspire Match</div>
          </div>
        </header>

        <main>
          <section className="intro">
            <h1>Find the right people in the pile, in minutes.</h1>
            <p>Add a job description, drop in the CVs, and get a ranked shortlist with a match score, the evidence behind it, and interview questions for every candidate.</p>
          </section>

          {/* STEP 1 */}
          <section className="step">
            <div className="step-num" aria-hidden>1</div>
            <div>
              <h2>Job description</h2>
              <div className="panel">
                <div className="tabs" role="group" aria-label="How to add the job description">
                  <button aria-pressed={jdMode === "upload"} onClick={() => setJdMode("upload")}>Upload file</button>
                  <button aria-pressed={jdMode === "paste"} onClick={() => setJdMode("paste")}>Paste text</button>
                </div>

                {jdMode === "upload" ? (
                  <DropZone multiple={false} onFiles={(f) => f[0] && setJdFile(f[0])}>
                    <strong>{jdFile ? jdFile.name : "Drop the JD here or click to choose"}</strong>
                    <small>PDF, DOCX or TXT, up to 4 MB</small>
                  </DropZone>
                ) : (
                  <textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the full job description here" aria-label="Job description text" />
                )}

                <div className="row">
                  <button className="btn" onClick={readJD} disabled={!canReadJd || jdLoading}>
                    {jdLoading ? "Reading the job description…" : jd ? "Read again" : "Read job description"}
                  </button>
                </div>
                {jdError && <p className="error">{jdError}</p>}

                {jd && (
                  <div style={{ marginTop: 24 }}>
                    <div className="jd-head">
                      <div>
                        <h3>{jd.title}</h3>
                        <div className="jd-meta">{[jd.company, jd.seniority, jd.location].filter(Boolean).join(", ")}</div>
                      </div>
                    </div>
                    <p style={{ margin: "10px 0 0" }}>{jd.summary}</p>

                    <div className="table-wrap">
                      <table className="criteria">
                        <thead>
                          <tr><th>Criterion</th><th>What good looks like</th><th>Type</th><th>Weight %</th><th /></tr>
                        </thead>
                        <tbody>
                          {criteria.map((c) => (
                            <tr key={c.id}>
                              <td><strong>{c.name}</strong></td>
                              <td className="detail">{c.detail}</td>
                              <td>
                                <button className={`pill${c.importance === "must" ? " must" : ""}`}
                                  onClick={() => updateCriterion(c.id, { importance: c.importance === "must" ? "nice" : "must" })}
                                  title="Switch between must-have and nice-to-have">
                                  {c.importance === "must" ? "Must-have" : "Nice-to-have"}
                                </button>
                              </td>
                              <td>
                                <input className="weight" type="number" min="0" max="100" value={c.weight}
                                  aria-label={`Weight for ${c.name}`}
                                  onChange={(e) => updateCriterion(c.id, { weight: Math.max(0, Number(e.target.value)) })} />
                              </td>
                              <td>
                                <button className="pill" onClick={() => setCriteria((l) => l.filter((x) => x.id !== c.id))} aria-label={`Remove ${c.name}`}>Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className={`total${weightTotal !== 100 ? " off" : ""}`}>
                      Total weight: {weightTotal}%{weightTotal !== 100 && " — scores still work, but 100% keeps them easy to read."}
                    </p>
                    <p className="hint">Change weights any time, even after scoring. The ranking updates on the spot.</p>
                      <div className="row">
  <button
    className="btn"
    onClick={async () => {
      try {
        const description = [
          jd.summary || "",
          ...criteria.map(
            (c) =>
              `${c.name}: ${c.detail || ""} [${c.importance || "nice"}; weight ${c.weight || 0}%]`
          ),
        ].filter(Boolean).join("\n");

        const { error } = await supabase.from("jobs").insert([
          {
            title: jd.title || "Untitled Job",
            description,
            status: "Open",
          },
        ]);

        if (error) throw error;

        alert("Job saved successfully ✓");
      } catch (error) {
        alert("Could not save job: " + error.message);
      }
    }}
  >
    Save Job
  </button>
</div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* STEP 2 */}
          <section className={`step${jd ? "" : " locked"}`} aria-disabled={!jd}>
            <div className="step-num" aria-hidden>2</div>
            <div>
              <h2>CVs</h2>
              <div className="panel">
                <DropZone multiple onFiles={addCvs}>
                  <strong>Drop CVs here or click to choose</strong>
                  <small>Add as many as you like. PDF, DOCX or TXT, up to 4 MB each</small>
                </DropZone>

                {cvFiles.length > 0 && (
                  <ul className="file-list">
                    {cvFiles.map((f, i) => (
                      <li key={f.name + f.size}>
                        <span>{f.name}</span>
                        <button onClick={() => setCvFiles((l) => l.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`}>Remove</button>
                      </li>
                    ))}
                  </ul>
                )}

                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  <label className="check">
                    <input type="checkbox" checked={blind} onChange={(e) => setBlind(e.target.checked)} />
                    <span><strong>Blind screening.</strong> Hide names and personal details so candidates are judged on skills and experience only.</span>
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>I confirm these candidates shared their CVs for this hiring process. Files are processed for scoring and not stored.</span>
                  </label>
                </div>

                <div className="row">
                  <button className="btn" onClick={scoreAll} disabled={!cvFiles.length || !consent || scoring || !criteria.length}>
                    {scoring ? `Scoring ${doneCount} of ${results.length}…` : `Score ${cvFiles.length || ""} CV${cvFiles.length === 1 ? "" : "s"}`}
                  </button>
                  {!consent && cvFiles.length > 0 && <span className="hint">Confirm consent to start scoring.</span>}
                </div>
                {scoring && (
                  <div className="progress" aria-hidden><span style={{ width: `${(doneCount / results.length) * 100}%` }} /></div>
                )}
              </div>
            </div>
          </section>

          {/* STEP 3 */}
          {results.length > 0 && (
            <section className="step">
              <div className="step-num" aria-hidden>3</div>
              <div>
                <h2>Ranked shortlist</h2>

                <div className="results">
                  {ranked.map((r, i) => {
                    const open = openKey === r.key;
                    const inReport = selected[r.key] ?? r.verdict.cls !== "no";
                    return (
                      <article className="cand" key={r.key}>
                        <div className="cand-top" onClick={() => setOpenKey(open ? null : r.key)}
                          role="button" tabIndex={0} aria-expanded={open}
                          onKeyDown={(e) => e.key === "Enter" && setOpenKey(open ? null : r.key)}>
                          <div className="rank">{i + 1}</div>
                          <ScoreRing value={r.overall} />
                          <div>
                            <div className="cand-name">{candidateLabel(r, blind)}</div>
                            <div className="cand-sub">
                              {[r.candidate?.currentTitle, r.candidate?.yearsExperience != null && `${r.candidate.yearsExperience} yrs`, r.candidate?.location].filter(Boolean).join(", ")}
                            </div>
                            <div className="cand-sub">{r.summary}</div>
                          </div>
                          <span className={`verdict ${r.verdict.cls}`}>{r.verdict.label}</span>
                        </div>

                        {open && (
                          <div className="cand-body">
                            <div>
                              <h4>Score by criterion</h4>
                              <div className="bars">
                                {criteria.map((c) => {
                                  const s = r.scores?.find((x) => x.id === c.id);
                                  return (
                                    <div key={c.id} className={`bar-row${c.importance === "must" ? " must" : ""}`}>
                                      <span>{c.name}</span>
                                      <div className="bar"><span style={{ width: `${s?.score ?? 0}%` }} /></div>
                                      <span>{s?.score ?? "–"}</span>
                                      {s?.evidence && <span className="evidence">{s.evidence}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                              {r.mustFail && <p className="hint flag" style={{ marginTop: 10 }}>Below the bar on at least one must-have, so this candidate can't be a strong fit.</p>}
                            </div>
                            <div className="cols">
                              <div><h4>Strengths</h4><ul>{(r.strengths || []).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
                              <div><h4>Gaps</h4><ul>{(r.gaps || []).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
                              <div>
                                <h4>Red flags</h4>
                                {r.redFlags?.length ? <ul className="flag">{r.redFlags.map((x, k) => <li key={k}>{x}</li>)}</ul> : <p className="hint" style={{ margin: 0 }}>None found.</p>}
                              </div>
                            </div>
                            <div><h4>Interview questions</h4><ul>{(r.interviewQuestions || []).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
                            <label className="check">
                              <input type="checkbox" checked={inReport} onChange={(e) => setSelected((s) => ({ ...s, [r.key]: e.target.checked }))} />
                              <span>Include in client report</span>
                            </label>
                            <p className="hint" style={{ margin: 0 }}>File: {r.fileName}</p>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {unfinished.map((r) => (
                    <div className="cand pending" key={r.key}>
                      {r.status === "error" ? <span className="flag">{r.fileName}: {r.error}</span> : `${r.fileName}: ${r.status === "scoring" ? "scoring…" : "waiting"}`}
                    </div>
                  ))}
                </div>

                {ranked.length > 0 && (
                  <div className="panel" style={{ marginTop: 20 }}>
                    <h3 style={{ fontSize: 18 }}>Share with the client</h3>
                    <p className="hint" style={{ margin: "4px 0 12px" }}>
                      The report includes {shortlist.length} candidate{shortlist.length === 1 ? "" : "s"} (strong fits and potentials by default; open a candidate to change this). Choose "Save as PDF" in the print window.
                    </p>
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client company name"
                      aria-label="Client company name" style={{ width: "100%", maxWidth: 360, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 8 }} />
                    <div className="row">
                      <button className="btn" onClick={() => window.print()} disabled={!shortlist.length}>Export client report</button>
                      <button className="btn ghost" onClick={downloadCsv}>Download full ranking (CSV)</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* PRINT-ONLY BRANDED REPORT */}
      <div className="report">
        <div className="report-head">
          <div className="wordmark">Hire <span className="amp">&amp;</span> Inspire<span className="by">by Christine</span></div>
          <div className="tagline">HIRE BETTER. INSPIRE MORE.</div>
        </div>
        <h2>Candidate shortlist: {jd?.title}</h2>
        <p style={{ margin: 0 }}>{[clientName && `Prepared for ${clientName}`, today].filter(Boolean).join(", ")}</p>
        <p>{jd?.summary}</p>

        {shortlist.map((r, i) => (
          <div className="report-cand" key={r.key}>
            <div className="report-cand-top">
              <div>
                <strong style={{ fontSize: 14 }}>{i + 1}. {candidateLabel(r, blind)}</strong>
                <div>{[r.candidate?.currentTitle, r.candidate?.yearsExperience != null && `${r.candidate.yearsExperience} years`].filter(Boolean).join(", ")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="report-score">{r.overall}%</div>
                <div>{r.verdict.label}</div>
              </div>
            </div>
            <p>{r.summary}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><strong>Strengths</strong><ul>{(r.strengths || []).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
              <div><strong>Areas to explore</strong><ul>{(r.gaps || []).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
            </div>
          </div>
        ))}

        <div className="report-foot">
          Prepared by Hire &amp; Inspire by Christine: Recruitment, Organization Development, Payroll Management.
          Scores support, and never replace, recruiter judgement.
          <br />hireandinspirebychristine.com  |  hello@hireandinspirebychristine.com
        </div>
      </div>
    </>
  );
}
