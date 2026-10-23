import { createClient } from "@supabase/supabase-js";

async function requireCompanyMember(request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice(7);
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) return false;
  const { data: memberships, error: memberError } = await db
    .from("company_members").select("company_id").eq("user_id", data.user.id).limit(2);
  return !memberError && memberships?.length === 1;
}

import { askClaude } from "@/lib/claude";
import { fileToBlocks } from "@/lib/files";
import { JD_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    if (!(await requireCompanyMember(req))) {
      return Response.json({ error: "Sign in with a company account to use AI tools." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    const text = (form.get("text") || "").toString().trim();

    let content;
    if (file && typeof file !== "string" && file.size > 0) {
      content = [...(await fileToBlocks(file)), { type: "text", text: "Analyse this job description." }];
    } else if (text.length > 50) {
      content = [{ type: "text", text: `Analyse this job description:\n\n${text}` }];
    } else {
      return Response.json({ error: "Upload a job description or paste at least a few lines of it." }, { status: 400 });
    }

    const jd = await askClaude({ system: JD_SYSTEM, content, maxTokens: 2500 });
    jd.criteria = normaliseWeights(jd.criteria || []);
    return Response.json(jd);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Guarantees ids exist and weights add up to 100.
function normaliseWeights(criteria) {
  const list = criteria.map((c, i) => ({ ...c, id: c.id || `c${i + 1}`, weight: Math.max(1, Number(c.weight) || 10) }));
  const total = list.reduce((s, c) => s + c.weight, 0);
  let running = 0;
  return list.map((c, i) => {
    const w = i === list.length - 1 ? 100 - running : Math.round((c.weight / total) * 100);
    running += w;
    return { ...c, weight: w };
  });
}
