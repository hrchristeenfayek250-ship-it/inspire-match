"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";
import { notificationDestination, notificationPreview } from "@/lib/notificationNavigation";

const styles = `
.nc{min-height:100vh;background:#f4f8f5;color:#193d2d;font-family:Arial,Helvetica,sans-serif}
.nc *{box-sizing:border-box}.nc-layout{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}
.nc-sidebar{padding:28px 16px;background:#fff;border-right:1px solid #e0e9e1}.nc-brand{font-size:19px;font-weight:900;margin:0 12px 28px}.nc-brand small{display:block;font-size:9px;color:#789280;letter-spacing:1.7px;margin-top:5px}
.nc-nav{display:flex;flex-direction:column;gap:4px}.nc-nav a{display:flex;gap:11px;text-decoration:none;font-size:12px;font-weight:750;padding:11px 12px;color:#526e5e;border-radius:9px}.nc-nav a.active,.nc-nav a:hover{color:#155a3a;background:#e7f4ea}
.nc-content{padding:36px clamp(18px,4vw,52px);max-width:1400px;margin:0 auto;width:100%}
.nc-header{display:flex;justify-content:space-between;flex-wrap:wrap;align-items:flex-start;gap:15px}.nc-eyebrow{font-size:11px;color:#54856a;font-weight:900;letter-spacing:2px}
.nc h1{font:normal clamp(29px,3.5vw,44px) Georgia,serif;margin:10px 0}.nc-muted{color:#748779;font-size:12px;line-height:1.6}
.nc-btn{display:inline-flex;align-items:center;justify-content:center;border:0;background:#176a48;color:#fff;border-radius:10px;padding:11px 15px;font-size:12px;text-decoration:none;font-weight:850;cursor:pointer;min-height:42px}
.nc-btn.secondary{background:#e6f3e9;color:#195f40}.nc-btn:disabled{opacity:.5;cursor:default}.nc-buttons{display:flex;gap:10px;flex-wrap:wrap}
.nc-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin:21px 0}
.nc-stat,.nc-panel{border:1px solid #e1ebe2;background:#fff;border-radius:16px;box-shadow:0 4px 20px #12592a0b}.nc-stat{padding:17px}.nc-stat strong{display:block;font-size:29px;color:#176740;margin:9px 0}.nc-stat span{font-size:12px;color:#6c8675;font-weight:800}
.nc-panel{padding:22px}.nc-filters{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px}.nc-filter{padding:11px 12px;background:#fff;color:#194b33;border:1px solid #dce8df;border-radius:10px;font:inherit;min-width:160px}
.nc-item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;padding:17px 3px;border-bottom:1px solid #e9efea;align-items:start}.nc-item:last-child{border-bottom:0}
.nc-item h2{font-size:14px;margin:7px 0;color:#1a4933}.nc-item p{font-size:12px;color:#5b7562;line-height:1.65;margin:7px 0;overflow-wrap:anywhere}.nc-item small{font-size:10px;color:#789080}
.nc-tags{display:flex;gap:6px;flex-wrap:wrap}.nc-tag{background:#eaf3ec;color:#267046;padding:4px 9px;border-radius:20px;font-size:10px;font-weight:850}
.nc-tag.high{background:#fff1e6;color:#965b2b}.nc-tag.read{background:#f2f4f2;color:#7b8980}
.nc-alert{padding:13px 16px;background:#fff0eb;color:#88392a;font-size:12px;border-radius:10px;margin:15px 0}
.nc-empty{text-align:center;padding:45px 20px;color:#73907e}
@media(max-width:950px){.nc-layout{display:block}.nc-sidebar{border-bottom:1px solid #e1eae3}.nc-nav{flex-direction:row;overflow-x:auto}.nc-nav a{white-space:nowrap}}
@media(max-width:600px){.nc-content{padding:19px 14px}.nc-panel{padding:14px}.nc-cards{gap:8px}.nc-stat{padding:12px}.nc-stat strong{font-size:25px}.nc-item{grid-template-columns:1fr;gap:10px}.nc-filter{width:100%}}
`;

function readableDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"});
}

export default function NotificationsCenter() {
  const [notifications, setNotifications]=useState([]);
  const [userId,setUserId]=useState("");
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [working,setWorking]=useState("");
  const [filter,setFilter]=useState("all");
  const [priority,setPriority]=useState("all");
  const [search,setSearch]=useState("");
  const [visibleCount,setVisibleCount]=useState(30);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const {data:auth,error:authError}=await supabase.auth.getUser();
      if(authError||!auth?.user)throw Error("Please sign in to view notifications.");
      setUserId(auth.user.id);
      const result=await supabase.from("notifications")
        .select("id,company_id,title,message,type,priority,action_url,is_read,created_at")
        .eq("recipient_id",auth.user.id)
        .order("created_at",{ascending:false})
        .limit(500);
      if(result.error)throw result.error;
      setNotifications(result.data||[]);
    }catch(e){setError(e.message||"Could not load your notifications.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  const unread=notifications.filter(n=>!n.is_read).length;
  const high=notifications.filter(n=>!n.is_read&&["high","urgent","critical"].includes(String(n.priority||"").toLowerCase())).length;
  const filtered=useMemo(()=>notifications.filter(n=>{
    if(filter==="unread"&&n.is_read)return false;
    if(filter==="read"&&!n.is_read)return false;
    if(priority!=="all"&&String(n.priority||"medium").toLowerCase()!==priority)return false;
    const preview=notificationPreview(n);
    return !search||[preview.title,preview.message,n.type].some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()));
  }),[notifications,filter,priority,search]);
  const visible=filtered.slice(0,visibleCount);
  async function markRead(item){
    if(!userId||item.is_read)return true;
    const result=await supabase.from("notifications").update({is_read:true,read_at:new Date().toISOString()})
      .eq("id",item.id).eq("recipient_id",userId).select("id").maybeSingle();
    if(result.error||!result.data){setError("Could not mark the notification as read.");return false;}
    setNotifications(current=>current.map(n=>n.id===item.id?{...n,is_read:true}:n));
    return true;
  }
  async function markAll(){
    if(!userId||!unread||working)return;
    setWorking("all");setError("");
    const result=await supabase.from("notifications").update({is_read:true,read_at:new Date().toISOString()})
      .eq("recipient_id",userId).eq("is_read",false).select("id");
    if(result.error){setError("Could not mark all notifications as read.");}
    else{
      const ids=new Set((result.data||[]).map(r=>String(r.id)));
      setNotifications(items=>items.map(n=>ids.has(String(n.id))?{...n,is_read:true}:n));
    }
    setWorking("");
  }
  async function openItem(item){
    if(working)return;
    setWorking(String(item.id));setError("");
    const destination=notificationDestination(item);
    await markRead(item);
    window.location.assign(destination.href);
  }
  return <main className="nc"><style>{styles}</style><div className="nc-layout"><aside className="nc-sidebar"><div className="nc-brand">✳ Inspire Match<small>HIRE BETTER. INSPIRE MORE.</small></div><ATSNavigation className="nc-nav"/></aside>
    <div className="nc-content">
      <header className="nc-header"><div><div className="nc-eyebrow">WORKSPACE / MOB-03</div><h1>Notifications Center</h1><p className="nc-muted">Review assigned work, urgent updates and approval reminders. Each action opens an authenticated workspace.</p></div>
      <div className="nc-buttons"><button className="nc-btn secondary" onClick={load} disabled={loading}>↻ Refresh</button><button className="nc-btn" onClick={markAll} disabled={!unread||!!working}>{working==="all"?"Updating...":"Mark all as read"}</button></div></header>
      {error&&<div className="nc-alert" role="alert">{error}</div>}
      <section className="nc-cards"><div className="nc-stat"><span>Total visible</span><strong>{loading?"—":notifications.length}</strong></div><div className="nc-stat"><span>Unread</span><strong>{loading?"—":unread}</strong></div><div className="nc-stat"><span>High priority unread</span><strong>{loading?"—":high}</strong></div></section>
      <section className="nc-panel"><div className="nc-filters"><select className="nc-filter" aria-label="Read status" value={filter} onChange={e=>{setFilter(e.target.value);setVisibleCount(30);}}><option value="all">All notifications</option><option value="unread">Unread only</option><option value="read">Read only</option></select>
      <select className="nc-filter" aria-label="Priority" value={priority} onChange={e=>{setPriority(e.target.value);setVisibleCount(30);}}><option value="all">All priorities</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <input className="nc-filter" aria-label="Search notifications" placeholder="Search notifications" value={search} onChange={e=>{setSearch(e.target.value);setVisibleCount(30);}}/></div>
      {loading?<div className="nc-empty">Loading notifications...</div>:!filtered.length?<div className="nc-empty">No notifications match your filters.</div>:
        visible.map(item=>{
          const preview=notificationPreview(item);
          const destination=notificationDestination(item);
          return <article className="nc-item" key={item.id}>
            <div><div className="nc-tags"><span className={"nc-tag "+(item.is_read?"read":"")}>{item.is_read?"Read":"Unread"}</span><span className={"nc-tag "+(["high","urgent","critical"].includes(String(item.priority||"").toLowerCase())?"high":"")}>{String(item.priority||"medium").toUpperCase()}</span>{item.type&&!preview.redacted&&<span className="nc-tag">{item.type}</span>}</div>
            <h2>{preview.title}</h2><p>{preview.message}</p><small>{readableDate(item.created_at)}</small></div>
            <div className="nc-buttons"><button className="nc-btn" type="button" disabled={!!working} onClick={()=>openItem(item)}>{working===String(item.id)?"Opening...":destination.exact?"Open action →":"Open workspace →"}</button>{!item.is_read&&<button className="nc-btn secondary" type="button" disabled={!!working} onClick={()=>markRead(item)}>Mark read</button>}</div>
          </article>;
        })}
      {filtered.length>visible.length&&<button className="nc-btn secondary" style={{marginTop:18}} onClick={()=>setVisibleCount(c=>c+30)}>Show more ({filtered.length-visible.length} remaining)</button>}
      </section><p className="nc-muted" style={{marginTop:18}}>Showing up to 500 most recent notifications accessible to this account. Offer-related notification previews are generalized to avoid exposing compensation details; record access is still enforced by company permissions and backend policies. Notification links only open internal ATS pages.</p>
    </div></div></main>;
}
