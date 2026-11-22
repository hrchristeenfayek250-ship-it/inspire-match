import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const err=(message,status=400)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
const statuses=new Set(["new","reviewed","rejected"]);
async function context(request){
 const token=(request.headers.get("authorization")||"").match(/^Bearer (.+)$/i)?.[1];
 if(!token)throw {message:"Please sign in again.",status:401};
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const serverKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!publicKey||!serverKey)throw {message:"Applications Inbox is not configured.",status:503};
 const publicClient=createClient(url,publicKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:{user},error:authError}=await publicClient.auth.getUser(token);
 if(authError||!user)throw {message:"Your session has expired.",status:401};
 const scoped=createClient(url,publicKey,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{autoRefreshToken:false,persistSession:false}});
 const {data:members,error:membersError}=await scoped.from("company_members").select("company_id,role").eq("user_id",user.id).limit(10);
 if(membersError)throw {message:"Could not verify your company access.",status:403};
 const allowed=(members||[]).filter(m=>["admin","hr_manager"].includes(String(m.role).toLowerCase()));
 if(allowed.length!==1)throw {message:"Only an Admin or HR Manager with a single authorized company can access this inbox.",status:403};
 return {admin:createClient(url,serverKey,{auth:{autoRefreshToken:false,persistSession:false}}),companyId:allowed[0].company_id};
}
const handle=e=>err(e?.message||"Unable to process request.",e?.status||500);
export async function GET(request){
 try{
  const {admin,companyId}=await context(request);
  const url=new URL(request.url);
  const id=url.searchParams.get("cv");
  if(id!==null){
   if(!/^\d+$/.test(id))return err("Invalid application.",400);
   const {data:app,error:lookupError}=await admin.from("inspire_career_applications").select("id,cv_path,cv_filename").eq("company_id",companyId).eq("id",id).maybeSingle();
   if(lookupError||!app)return err("Application not found.",404);
   const {data:signed,error:signError}=await admin.storage.from("inspire-career-cvs").createSignedUrl(app.cv_path,60);
   if(signError||!signed?.signedUrl)return err("Unable to open this CV.",503);
   return NextResponse.json({url:signed.signedUrl,filename:app.cv_filename},{headers:{"Cache-Control":"no-store"}});
  }
  const {data,error:queryError}=await admin.from("inspire_career_applications").select("id,job_id,full_name,email,phone,cv_filename,source,status,created_at").eq("company_id",companyId).order("created_at",{ascending:false}).limit(200);
  if(queryError)throw {message:"Unable to load applications.",status:503};
  const ids=[...new Set((data||[]).map(a=>a.job_id))];
  let titles={};
  if(ids.length){
   const {data:jobs,error:jobsError}=await admin.from("jobs").select("id,title").eq("company_id",companyId).in("id",ids);
   if(!jobsError)titles=Object.fromEntries((jobs||[]).map(j=>[j.id,j.title]));
  }
  return NextResponse.json({applications:(data||[]).map(a=>({...a,job_title:titles[a.job_id]||`Job #${a.job_id}`}))},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return handle(e)}
}
export async function PATCH(request){
 try{
  const {admin,companyId}=await context(request);
  let body;try{body=await request.json()}catch{return err("Invalid update.");}
  const id=Number(body?.id),status=body?.status;
  if(!Number.isSafeInteger(id)||id<1||!statuses.has(status))return err("Invalid application status.");
  const {data,error:updateError}=await admin.from("inspire_career_applications").update({status}).eq("company_id",companyId).eq("id",id).neq("status","imported").select("id,status").maybeSingle();
  if(updateError)return err("Unable to update application.",503);
  if(!data)return err("Application not found or already imported.",404);
  return NextResponse.json({application:data},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return handle(e)}
}
