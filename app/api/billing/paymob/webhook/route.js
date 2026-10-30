import {createHmac,timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";

const FIELDS=[
 "amount_cents","created_at","currency","error_occured","has_parent_transaction",
 "id","integration_id","is_3d_secure","is_auth","is_capture",
 "is_refunded","is_standalone_payment","is_voided","order.id","owner","pending",
 "source_data.pan","source_data.sub_type","source_data.type","success"
];
function getPath(value,path){return path.split(".").reduce((a,key)=>a?.[key],value);}
function asValue(value){
 if(value===null||value===undefined)return "";
 if(typeof value==="boolean")return value?"true":"false";
 return String(value);
}
function verify(obj,received,secret){
 if(!/^[0-9a-f]{128}$/i.test(received||"")||!secret)return false;
 const concatenated=FIELDS.map(f=>asValue(getPath(obj,f))).join("");
 const expected=createHmac("sha512",secret).update(concatenated).digest();
 const actual=Buffer.from(received,"hex");
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
const json=(body,status)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(request){
 const secret=process.env.PAYMOB_HMAC_SECRET;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const mode=process.env.PAYMOB_MODE;
 if(!secret||!service||!url||!["live","test"].includes(mode))return json({error:"Payment webhooks are disabled"},503);
 try{
  const raw=await request.text();
  if(raw.length>100000)return json({error:"Payload too large"},413);
  const payload=JSON.parse(raw);
  if(payload?.type!=="TRANSACTION"||!payload?.obj||typeof payload.obj!=="object")return json({error:"Unsupported event"},400);
  const obj=payload.obj;
  const received=new URL(request.url).searchParams.get("hmac");
  if(!verify(obj,received,secret))return json({error:"Invalid signature"},401);
  if((mode==="live")!==Boolean(obj.is_live))return json({error:"Payment environment mismatch"},400);
  if(obj.pending===true)return json({ok:true,status:"pending"},200);
  if(obj.is_voided===true||obj.is_auth===true&&obj.is_capture!==true)return json({ok:true,status:"ignored"},200);
  const orderId=obj.order?.id,transactionId=obj.id;
  const amount=obj.amount_cents,currency=obj.currency;
  if(!Number.isSafeInteger(Number(amount))||Number(amount)<=0||!orderId||!transactionId||typeof currency!=="string")
   return json({error:"Invalid transaction fields"},400);
  const fullRefund=obj.is_refunded===true&&Number(obj.refunded_amount_cents)>=Number(amount);
  const paid=obj.success===true&&!fullRefund;
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.rpc("billing_apply_paymob_transaction",{
   p_provider_order_id:String(orderId),
   p_transaction_id:String(transactionId),
   p_amount_minor:Number(amount),
   p_currency:currency,
   p_success:paid,
   p_refunded:fullRefund,
   p_is_live:obj.is_live===true
  });
  if(error){
   console.error("Billing webhook DB processing failed:",error.message);
   return json({error:"Unable to record payment"},500);
  }
  if(["unknown_order","amount_mismatch","environment_mismatch","invoice_mismatch","missing_transaction"].includes(data)){
   console.error("Billing webhook rejected:",data);
   return json({error:"Transaction verification failed"},422);
  }
  return json({ok:true,status:data},200);
 }catch(error){
  console.error("Billing webhook processing failed:",error?.message);
  return json({error:"Invalid callback"},400);
 }
}
