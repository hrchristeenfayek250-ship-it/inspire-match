"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
const styles=`
.fb-page{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:0!important;min-height:100vh;background:#f5f8f6;color:#214632;font:13px/1.6 Arial,sans-serif}
.fb-page *{box-sizing:border-box}.fb-layout{display:grid;grid-template-columns:252px minmax(0,1fr);min-height:100vh}
.fb-side{background:#fff;border-right:1px solid #e4ede6;padding:27px 14px}
.fb-brand{display:flex;align-items:center;gap:11px;padding:4px 13px 30px;font-size:17px;font-weight:850}
.fb-mark{display:grid;plafb-items:center;width:36px;height:36px;border-radius:11px;background:#14583e;color:white;font-size:22px}
.fb-brand small{display:block;color:#8a9d8f;letter-spacing:1.5px;font-size:9px}
.fb-nav{display:flex;flex-direction:column;gap:4px}.fb-nav a{display:flex;align-items:center;gap:12px;min-height:40px;padding:10px 12px;border-radius:10px;color:#5d7267;text-decoration:none;font-size:12px;font-weight:700}
.fb-nav a span{width:17px;text-align:center}.fb-nav a:hover,.fb-nav a.active{background:#e5f2e9;color:#145f42}
.fb-main{min-width:0;padding:0 clamp(18px,3.4vw,54px) 65px}.fb-wrap{max-width:1240px;margin:auto}
.fb-top{height:77px;display:flex;justify-content:spafb-between;align-items:center;gap:12px;border-bottom:1px solid #e5ece7;margin-bottom:30px}
.fb-link{color:#19734c;text-decoration:none;font-weight:800;font-size:12px}
.fb-hero{background:linear-gradient(115deg,#103c2c,#176448 72%,#217755);border-radius:22px;padding:36px 38px;color:#fff;box-shadow:0 12px 32px #134a311a}
.fb-hero small{color:#b7e5cb;letter-spacing:2px;font-size:10px;font-weight:850}.fb-hero h1{font:850 clamp(27px,3vw,36px)/1.2 Arial,sans-serif;color:#fff;margin:13px 0}.fb-hero p{color:#dceee4;font-size:13px;max-width:730px;margin:0}
.fb-controls{display:flex;gap:13px;flex-wrap:wrap;align-items:end;margin:25px 0 18px}.fb-controls label{font-size:11px;font-weight:800;color:#688372}
.fb-input{display:block;margin-top:6px;min-width:150px;padding:11px;border:1px solid #d9e7dc;border-radius:9px;background:#fff;color:#22543b;font:12px Arial}
.fb-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-bottom:17px}
.fb-metric,.fb-panel{background:#fff;border:1px solid #e1ebe4;border-radius:15px;padding:22px;min-width:0}
.fb-metric span{font-size:11px;font-weight:800;color:#708b78}.fb-metric strong{display:block;font-size:29px;color:#19764e;margin:8px 0}.fb-metric small{color:#8a9f8e;font-size:11px}
.fb-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:17px}
.fb-panel h2{font:800 17px Arial,sans-serif;color:#1c4531;margin:0 0 9px}
.fb-desc{color:#809687;font-size:12px;margin:0 0 16px}
.fb-row{display:flex;justify-content:spafb-between;align-items:center;gap:14px;border-top:1px solid #edf2ee;padding:14px 0}
.fb-row strong{font-size:12px}.fb-row small{display:block;color:#819688;font-size:11px;margin-top:5px}
.fb-tag{display:inline-block;padding:5px 10px;border-radius:30px;background:#e7f3eb;color:#20734b;font-size:10px;font-weight:800;white-space:nowrap}
.fb-tag.warn{background:#fff0dd;color:#986b2a}.fb-tag.bad{background:#ffebe6;color:#a54b37}
.fb-tablewrap{overflow-x:auto}.fb-table{width:100%;border-collapse:collapse;min-width:710px;font-size:12px}
.fb-table th{background:#f7faf8;text-align:left;color:#708b79;font-size:10px;padding:13px}.fb-table td{padding:13px;border-top:1px solid #edf2ee;color:#3d604a}
.fb-error{padding:13px;background:#fff0e6;color:#a6503d;border-radius:9px;margin:14px 0}
.fb-note{font-size:11px;color:#82988a;line-height:1.7;margin-top:16px}
@media(max-width:1040px){.fb-grid{grid-template-columns:1fr}.fb-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.fb-layout{display:block}.fb-side{padding:13px 16px;border-right:0;border-bottom:1px solid #e4ede6}.fb-brand{padding:0 0 12px}.fb-nav{flex-direction:row;overflow:auto}.fb-nav a{flex:0 0 auto;white-space:nowrap}.fb-main{padding:0 15px 40px}.fb-top{height:60px;margin-bottom:18px}.fb-hero{padding:26px 22px}.fb-panel,.fb-metric{padding:16px}}

.fb-pill{padding:6px 10px;border-radius:99px;background:#edf6ef;color:#216844;font-size:10px;font-weight:800}
.fb-heat{height:9px;background:#eaf1ec;border-radius:99px;overflow:hidden;margin-top:7px}
.fb-heat span{display:block;height:100%;background:#278254;border-radius:99px}
.fb-heat span.fb-alert{background:#d99a50}
.fb-btn{cursor:pointer;font-weight:800}
.fb-btn:disabled{opacity:.5;cursor:not-allowed}

.fb-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.fb-form label{display:flex;flex-direction:column;gap:5px;font-weight:800;font-size:11px;color:#426451}
.fb-form .wide{grid-column:1/-1}
.fb-form textarea{min-height:90px;resize:vertical}
.fb-action{background:#176448!important;color:white!important;font-weight:800;cursor:pointer}
.fb-action:disabled{opacity:.5}
.fb-star{font-size:19px;color:#22774f;font-weight:850}
@media(max-width:700px){.fb-form{grid-template-columns:1fr}}
`;

const categories=["Application Experience","Recruiter Communication","Interview Experience","Process Clarity","Overall Experience"];
const sourceOptions=["Candidate reported","Recruiter observation"];
const fmt=x=>x?new Date(x).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"—";
const csv=x=>{const s=String(x??"");return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};
export default function CandidateFeedback(){
 const [companies,setCompanies]=useState([]),[company,setCompany]=useState(""),[candidates,setCandidates]=useState([]),[entries,setEntries]=useState([]),[selected,setSelected]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[reload,setReload]=useState(0),[categoryFilter,setCategoryFilter]=useState("All"),[form,setForm]=useState({category:categories[0],source:"Candidate reported",rating:"4",feedback:"",action_required:false});
 useEffect(()=>{let active=true;(async()=>{const a=await supabase.auth.getUser();if(!active)return;if(!a.data?.user){setError("Please sign in.");setLoading(false);return;}const r=await supabase.from("company_members").select("company_id").eq("user_id",a.data.user.id);if(!active)return;if(r.error)setError(r.error.message);else{setCompanies(r.data||[]);setCompany(r.data?.[0]?.company_id||"");}setLoading(false);})();return()=>{active=false;};},[]);
 useEffect(()=>{if(!company){setCandidates([]);setEntries([]);return;}let active=true;setLoading(true);setError("");(async()=>{const [c,f]=await Promise.all([supabase.from("candidates").select("id,full_name").eq("company_id",company).is("deleted_at",null).order("full_name").limit(5000),supabase.from("candidate_experience_feedback").select("id,candidate_id,category,source,rating,feedback,action_required,created_at").eq("company_id",company).order("created_at",{ascending:false}).limit(5000)]);if(!active)return;if(c.error||f.error){setError([c.error?.message,f.error?.message].filter(Boolean).join("; "));setCandidates([]);setEntries([]);}else{setCandidates(c.data||[]);setEntries(f.data||[]);setSelected(s=>(c.data||[]).some(x=>String(x.id)===s)?s:String(c.data?.[0]?.id||""));}setLoading(false);})();return()=>{active=false;};},[company,reload]);
 const names=new Map(candidates.map(c=>[String(c.id),c.full_name||"Unnamed"]));
 const reported=entries.filter(e=>e.source==="Candidate reported");
 const average=reported.length?(reported.reduce((a,e)=>a+Number(e.rating||0),0)/reported.length).toFixed(1):"—";
 const attention=entries.filter(e=>e.action_required);
 const low=reported.filter(e=>e.rating<=2);
 const categoriesData=categories.map(category=>{const list=reported.filter(e=>e.category===category);return {category,count:list.length,avg:list.length?(list.reduce((a,e)=>a+Number(e.rating),0)/list.length).toFixed(1):"—"};});
 const visible=entries.filter(e=>categoryFilter==="All"||e.category===categoryFilter);
 async function save(e){e.preventDefault();if(saving||!company||!selected)return;setSaving(true);setError("");setSuccess("");try{const a=await supabase.auth.getUser();if(!a.data?.user)throw Error("Please sign in.");if(!form.feedback.trim())throw Error("Please enter feedback details.");const r=await supabase.from("candidate_experience_feedback").insert({company_id:company,candidate_id:selected,created_by:a.data.user.id,category:form.category,source:form.source,rating:Number(form.rating),feedback:form.feedback.trim(),action_required:form.action_required}).select("id").single();if(r.error)throw r.error;setSuccess("Feedback saved.");setForm(f=>({...f,feedback:"",action_required:false}));setReload(x=>x+1);}catch(err){setError(err.message||"Unable to save feedback.");}finally{setSaving(false);}}
 function exportCsv(){const rows=[["Candidate","Category","Source","Rating","Needs Attention","Feedback","Recorded"],...entries.map(e=>[names.get(String(e.candidate_id))||e.candidate_id,e.category,e.source,e.rating,e.action_required?"Yes":"No",e.feedback,e.created_at])];const blob=new Blob(["\uFEFF"+rows.map(r=>r.map(csv).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="candidate-experience-feedback.csv";a.click();URL.revokeObjectURL(url);}
 return <main className="fb-page"><style>{styles}</style><div className="fb-layout"><aside className="fb-side"><div className="fb-brand"><span className="fb-mark">I</span><div>Inspire Match<small>TALENT INTELLIGENCE</small></div></div><ATSNavigation className="fb-nav"/></aside><div className="fb-main"><div className="fb-wrap">
 <div className="fb-top"><span>Recruitment Operations / Candidate Feedback</span><Link className="fb-link" href="/app/recruitment-operations">← All Operations</Link></div>
 <header className="fb-hero"><small>EXPERIENCE INTELLIGENCE / VOICE OF CANDIDATE</small><h1>Candidate Feedback &amp; Experience Insights</h1><p>Capture candidate-reported feedback separately from recruiter observations. Review satisfaction scores, themes and improvement opportunities without inventing survey responses.</p></header>
 <div className="fb-controls"><label>Company<select className="fb-input" value={company} onChange={e=>setCompany(e.target.value)}>{companies.map(c=><option key={c.company_id} value={c.company_id}>Company {String(c.company_id).slice(0,8)}</option>)}</select></label><label>Candidate<select className="fb-input" value={selected} onChange={e=>setSelected(e.target.value)}>{candidates.map(c=><option key={c.id} value={String(c.id)}>{c.full_name||"Unnamed candidate"}</option>)}</select></label><button className="fb-input" disabled={loading||!company} onClick={()=>setReload(x=>x+1)}>↻ Refresh</button><button className="fb-input" disabled={!entries.length} onClick={exportCsv}>↓ Export CSV</button></div>
 {error&&<div className="fb-error" role="alert">{error}</div>}{success&&<div role="status" style={{padding:12,color:"#176448"}}>{success}</div>}
 <div className="fb-metrics">{[["Reported Feedback",reported.length,"Candidate-sourced entries"],["Average Rating",average,"Candidate-reported / 5"],["Low Ratings",low.length,"Candidate ratings of 1–2"],["Attention Flags",attention.length,"Marked for review"]].map(([title,n,desc])=><div className="fb-metric" key={title}><span>{title}</span><strong>{loading?"—":n}</strong><small>{desc}</small></div>)}</div>
 <div className="fb-grid"><section className="fb-panel"><h2>Record Experience Feedback</h2><p className="fb-desc">Only choose Candidate reported if the candidate actually provided this feedback. Ratings entered by recruiters are not counted as candidate satisfaction.</p><form className="fb-form" onSubmit={save}><label>Experience area<select className="fb-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{categories.map(x=><option key={x}>{x}</option>)}</select></label><label>Source<select className="fb-input" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>{sourceOptions.map(x=><option key={x}>{x}</option>)}</select></label><label>Rating (1–5)<select className="fb-input" value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}>{[1,2,3,4,5].map(x=><option key={x} value={x}>{x} / 5</option>)}</select></label><label>Requires attention<select className="fb-input" value={String(form.action_required)} onChange={e=>setForm(f=>({...f,action_required:e.target.value==="true"}))}><option value="false">No</option><option value="true">Yes</option></select></label><label className="wide">Feedback details<textarea className="fb-input" maxLength={3000} required value={form.feedback} onChange={e=>setForm(f=>({...f,feedback:e.target.value}))} placeholder="Record the actual feedback or recruiter observation..."/></label><button type="submit" className="fb-input fb-action wide" disabled={saving||loading||!selected}>{saving?"Saving...":"Save Feedback"}</button></form></section>
 <section className="fb-panel"><h2>Experience by Area</h2><p className="fb-desc">Only candidate-reported entries contribute to these ratings.</p>{categoriesData.map(x=><div className="fb-row" key={x.category}><div style={{flex:1}}><strong>{x.category}</strong><small>{x.count} reported entries</small></div><span className="fb-star">{x.avg}{x.avg!=="—"?"/5":""}</span></div>)}</section></div>
 <section className="fb-panel"><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><h2>Experience Feedback Register</h2><p className="fb-desc">A traceable record of reported feedback and internal observations.</p></div><label>Area<select className="fb-input" value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option>All</option>{categories.map(x=><option key={x}>{x}</option>)}</select></label></div><div className="fb-tablewrap"><table className="fb-table"><thead><tr>{["Candidate","Area","Source","Rating","Attention","Recorded","Feedback"].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{visible.slice(0,150).map(e=><tr key={e.id}><td>{names.get(String(e.candidate_id))||"Candidate"}</td><td>{e.category}</td><td>{e.source}</td><td><strong>{e.rating}/5</strong></td><td>{e.action_required?<span className="fb-tag bad">Review</span>:<span className="fb-tag">—</span>}</td><td>{fmt(e.created_at)}</td><td style={{maxWidth:350,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{e.feedback}</td></tr>)}</tbody></table></div>{!visible.length&&<p className="fb-desc" style={{marginTop:18}}>No feedback records yet.</p>}<p className="fb-note">This module records feedback manually. It does not send surveys, verify candidate identity or calculate a representative response rate. Candidate satisfaction metrics reflect only the candidate-reported records entered here.</p></section>
 </div></div></div></main>;
}
