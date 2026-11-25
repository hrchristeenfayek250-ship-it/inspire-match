import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail=(message,status)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request) {
 try {
  const token=(request.headers.get("authorization")||"").match(/^Bearer (.+)$/i)?.[1];
  if(!token)return fail("Please sign in again.",401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!anon||!secret)return fail("Pipeline service is not configured.",503);
  const auth=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:authError}=await auth.auth.getUser(token);
  if(authError||!user)return fail("Session expired.",401);
  const scoped=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{autoRefreshToken:false,persistSession:false}});
  const {data:members,error:memberError}=await scoped.from("company_members").select("company_id").eq("user_id",user.id).limit(2);
  if(memberError||members?.length!==1)return fail("Company access could not be verified.",403);
  const companyId=members[0].company_id;
  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data,error}=await admin.from("applications").select("candidate_id,job_id").eq("company_id",companyId).limit(10000);
  if(error)return fail("Could not load job associations.",503);
  const links={};
  for(const row of data||[]){
   if(row.candidate_id==null||row.job_id==null)continue;
   const id=String(row.candidate_id);
   if(!links[id])links[id]=[];
   if(!links[id].includes(String(row.job_id)))links[id].push(String(row.job_id));
  }
  return NextResponse.json({links},{headers:{"Cache-Control":"no-store"}});
 } catch {
  return fail("Unable to load job associations.",500);
 }
}
