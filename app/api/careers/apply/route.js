import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";
const LIMIT=5*1024*1024;
const fail=(message,status=400)=>NextResponse.json({error:message},{status});
export async function POST(request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const captcha=process.env.TURNSTILE_SECRET_KEY;
 if(!url||!key||!captcha)return fail("Online applications are not enabled yet.",503);
 const size=Number(request.headers.get("content-length")||0);
 if(size>LIMIT+100000)return fail("CV exceeds the 5 MB limit.",413);
 let form;
 try{form=await request.formData()}catch{return fail("Invalid application form.")}
 if(form.get("website"))return fail("Application could not be accepted.");
 const site=String(form.get("slug")||"").trim();
 const jobId=Number(form.get("job_id"));
 const fullName=String(form.get("full_name")||"").trim();
 const email=String(form.get("email")||"").trim().toLowerCase();
 const phone=String(form.get("phone")||"").trim();
 const consent=form.get("consent")==="yes";
 const token=String(form.get("captcha")||"");
 const file=form.get("cv");
 if(!/^[a-z0-9][a-z0-9-]{2,62}$/.test(site)||!Number.isSafeInteger(jobId)||jobId<1)return fail("Invalid job.");
 if(fullName.length<2||fullName.length>160||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||phone.length>40||!consent)return fail("Check the required details and consent.");
 if(!(file instanceof File)||file.size===0||file.size>LIMIT)return fail("Upload a PDF or DOCX CV, maximum 5 MB.");
 if(!token)return fail("Complete the verification before applying.");
 let verified=false;
 try{
  const body=new URLSearchParams({secret:captcha,response:token});
  const result=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",body,cache:"no-store",signal:AbortSignal.timeout(7000)});
  verified=(await result.json()).success===true;
 }catch{return fail("Verification temporarily unavailable.",503);}
 if(!verified)return fail("Verification failed. Please retry.");
 const bytes=new Uint8Array(await file.arrayBuffer());
 const pdf=bytes.length>4&&bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;
 const docx=bytes.length>3&&bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;
 const isPdf=pdf&&file.name.toLowerCase().endsWith(".pdf");
 const isDocx=docx&&file.name.toLowerCase().endsWith(".docx");
 if(!isPdf&&!isDocx)return fail("Only PDF or DOCX documents are supported.");
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:siteRecord,error:siteErr}=await admin.from("inspire_career_sites").select("company_id").eq("slug",site).eq("is_live",true).maybeSingle();
 if(siteErr||!siteRecord)return fail("This career page is not accepting applications.",404);
 const {data:post,error:postErr}=await admin.from("inspire_career_job_posts").select("job_id").eq("job_id",jobId).eq("company_id",siteRecord.company_id).eq("published",true).maybeSingle();
 if(postErr||!post)return fail("The selected position is no longer open for applications.",404);
 const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-120);
 const path=`${siteRecord.company_id}/${crypto.randomUUID()}/${safeName}`;
 const contentType=isPdf?"application/pdf":"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
 const upload=await admin.storage.from("inspire-career-cvs").upload(path,bytes,{upsert:false,contentType});
 if(upload.error)return fail("CV could not be uploaded. Please try again.",503);
 const inserted=await admin.from("inspire_career_applications").insert({company_id:siteRecord.company_id,job_id:jobId,full_name:fullName,email,phone:phone||null,cv_path:path,cv_filename:safeName,consent_confirmed:true,source:"Career Page"}).select("id").single();
 if(inserted.error){await admin.storage.from("inspire-career-cvs").remove([path]);return fail("Unable to save your application. Please retry.",503);}
 return NextResponse.json({ok:true,message:"Your application has been received."},{status:201,headers:{"Cache-Control":"no-store"}});
}