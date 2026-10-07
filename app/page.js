INSPIRE MATCH — SAVE CANDIDATE FIX

This is the exact replacement for the current saveCandidate function
in app/page.js.

Replace the existing:
async function saveCandidate(...)

with the code below.

This saves:
- Match Score
- AI Verdict
- Matched Job
- AI Summary
- Strengths
- Gaps
- Red Flags
- Interview Questions

IMPORTANT:
Do not delete anything else from app/page.js.

CODE:
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
