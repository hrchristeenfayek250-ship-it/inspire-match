"use client";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const demo = [{offer_id:"sample-offer",job_title:"Senior Product Designer",step_name:"Hiring Manager Approval",step_status:"pending"}];
const actions = [
  {value:"approved",label:"Approve"},
  {value:"rejected",label:"Reject"},
  {value:"changes_requested",label:"Request Changes"}
];

export default function HiringOfferApprovals({ offers = [], designPreview = false, onDecided }) {
  const [search,setSearch] = useState("");
  const [filter,setFilter] = useState("all");
  const [draft,setDraft] = useState(null);
  const [comments,setComments] = useState("");
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [demoReviewed,setDemoReviewed] = useState(false);
  const pending = designPreview ? (demoReviewed ? [] : demo) : offers;
  const visible = useMemo(() => pending.filter(item =>
    (filter === "all" || String(item.step_name || "").toLowerCase().includes(filter)) &&
    [item.job_title,item.step_name].join(" ").toLowerCase().includes(search.toLowerCase())
  ),[pending,filter,search]);

  function openDraft(offer,action){
    setDraft({offerId:offer.offer_id,action});
    setComments("");
    setError("");
    setMessage("");
  }

  async function submitDecision() {
    if (!draft || saving || (draft.action !== "approved" && !comments.trim())) return;
    setError("");setMessage("");
    if (designPreview) {
      setDemoReviewed(true);setDraft(null);setComments("");
      setMessage("Sample decision recorded for design preview only. No database changes were made.");
      return;
    }
    setSaving(true);
    try {
      const {error:writeError} = await supabase.rpc("decide_offer_approval",{
        p_offer_id:draft.offerId,p_action:draft.action,p_comments:comments.trim() || null
      });
      if (writeError) throw writeError;
      setDraft(null);setComments("");
      setMessage("Your offer decision was recorded.");
      if (onDecided) await onDecided();
    } catch(e) {
      setError(e?.message || "Could not submit this approval.");
    } finally {setSaving(false);}
  }

  return <section className="hm-panel">
    <div className="hm-panel-head">
      <h2>Job Offers Awaiting My Approval</h2>
      <span className="hm-pill">{pending.length} pending</span>
    </div>
    <p className="hm-muted">Review and decide assigned approval steps here, without access to compensation details.</p>
    <div className="hm-filters">
      <input aria-label="Search pending job offers" placeholder="Search by job or approval step" value={search} onChange={e=>setSearch(e.target.value)}/>
      <select aria-label="Filter offer approval step" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">All approval steps</option>
        <option value="hiring manager">Hiring Manager</option>
        <option value="hr">HR</option>
        <option value="admin">Admin</option>
      </select>
    </div>
    {error && <p role="alert" className="hm-error">{error}</p>}
    {message && <p role="status" className="hm-note">{message}</p>}
    {visible.length === 0 ? <div className="hm-empty">No pending offer approvals match these filters.</div> :
      visible.map(item=><div key={item.offer_id}>
        <div className="hm-row">
          <div><strong>{item.job_title || "Job offer approval"}</strong>
            {designPreview && <span className="hm-sample">SAMPLE</span>}
            <div className="hm-detail"><span>{item.step_name || "Approval step"}</span><span>Pending review</span></div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {actions.map(action=><button key={action.value} type="button" className="hm-button"
              disabled={saving} onClick={()=>openDraft(item,action.value)}>{action.label}</button>)}
          </div>
        </div>
        {draft?.offerId === item.offer_id && <div style={{background:"#f2f8f4",padding:18,borderRadius:12,display:"grid",gap:12}}>
          <strong>Confirm {actions.find(a=>a.value===draft.action)?.label}</strong>
          <label>Comments {draft.action === "approved" ? "(optional)" : "(required)"}
            <textarea rows={3} maxLength={5000} value={comments} onChange={e=>setComments(e.target.value)}
              style={{display:"block",width:"100%",border:"1px solid #d6e5da",borderRadius:9,padding:12,marginTop:8}}/>
          </label>
          <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
            <button type="button" className="hm-button" onClick={submitDecision}
              disabled={saving || (draft.action !== "approved" && !comments.trim())}>
              {saving ? "Saving…" : "Confirm Decision"}
            </button>
            <button type="button" className="hm-button" onClick={()=>setDraft(null)} disabled={saving}>Cancel</button>
          </div>
        </div>}
      </div>)
    }
    {designPreview && <p className="hm-muted">Sample interactions are temporary and do not save live data.</p>}
  </section>;
}
