import { redirect } from "next/navigation";

// Candidate Comparison is disabled in the development preview.
// Preserve the route as a safe redirect so existing bookmarks do not break.
export default function CandidateComparisonDisabled() {
  redirect("/app/matching");
}
