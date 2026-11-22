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

export async function POST(request){
 try{
  const {admin,companyId}=await context(request);
  const token=(request.headers.get("authorization")||"").match(/^Bearer (.+)$/i)?.[1];
  const publicClient=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:authError}=await publicClient.auth.getUser(token);
  if(authError||!user)return err("Please sign in again.",401);
  let body;try{body=await request.json()}catch{return err("Invalid import request.");}
  const id=Number(body?.id);
  if(!Number.isSafeInteger(id)||id<1)return err("Invalid application.",400);
  const {data:app,error:lookupError}=await admin.from("inspire_career_applications")
    .select("id,company_id,job_id,email,status,cv_path,cv_filename,imported_candidate_id")
    .eq("company_id",companyId).eq("id",id).maybeSingle();
  if(lookupError||!app)return err("Application not found.",404);
  if(app.status==="imported")return NextResponse.json({candidate_id:app.imported_candidate_id,already_imported:true},{headers:{"Cache-Control":"no-store"}});
  const {data:job,error:jobError}=await admin.from("jobs").select("id").eq("id",app.job_id).eq("company_id",companyId).maybeSingle();
  if(jobError||!job)return err("Job is not available for your company.",404);
  // Duplicate candidates are linked to the application, not overwritten.
  const {data:existing,error:existingError}=await admin.from("candidates").select("id,email").eq("company_id",companyId).ilike("email",app.email.trim()).limit(1);
  if(existingError)return err("Unable to check existing candidates.",503);
  let newPath=null;
  if(!(existing||[]).length){
   const {data:file,error:downloadError}=await admin.storage.from("inspire-career-cvs").download(app.cv_path);
   if(downloadError||!file)return err("Unable to retrieve the original CV.",503);
   newPath=`${companyId}/career-imports/${crypto.randomUUID()}/${app.cv_filename.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
   const {error:uploadError}=await admin.storage.from("candidate-cvs").upload(newPath,file,{upsert:false,contentType:app.cv_filename.toLowerCase().endsWith(".pdf")?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
   if(uploadError)return err("Unable to copy CV to candidate storage.",503);
  }
  const {data:result,error:importError}=await admin.rpc("import_inspire_career_application",{
   p_application_id:id,p_company_id:companyId,p_actor_id:user.id,p_cv_file_path:newPath
  });
  if(importError){
   if(newPath)await admin.storage.from("candidate-cvs").remove([newPath]);
   return err("Import failed. Check the career import database migration.",503);
  }
  if(newPath&&!result?.created)await admin.storage.from("candidate-cvs").remove([newPath]);
  return NextResponse.json({candidate_id:result.candidate_id,created:result.created,already_imported:result.already_imported,status:"imported"},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return handle(e)}
}
