import {createClient} from "@supabase/supabase-js";
export const runtime="nodejs";

const response=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const regions={
  EGY:{base:"https://accept.paymob.com",currency:"EGP",country:"EGY"},
  KSA:{base:"https://ksa.paymob.com",currency:"SAR",country:"SAU"},
  UAE:{base:"https://uae.paymob.com",currency:"AED",country:"ARE"},
  OMN:{base:"https://oman.paymob.com",currency:"OMR",country:"OMN"}
};
export async function POST(request){
 let reserved=null,admin=null;
 try{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const secret=process.env.PAYMOB_SECRET_KEY;
  const publicKey=process.env.PAYMOB_PUBLIC_KEY;
  const integration=process.env.PAYMOB_INTEGRATION_ID_CARD;
  const hmac=process.env.PAYMOB_HMAC_SECRET;
  const region=regions[process.env.PAYMOB_REGION||"EGY"];
  const mode=process.env.PAYMOB_MODE;
  const origin=process.env.APP_URL;
  if(!url||!anon||!service||!secret||!publicKey||!integration||!hmac||!region||!["test","live"].includes(mode)||!origin) {
   return response({error:"Payments are not configured yet. Complete the Paymob merchant setup first."},503);
  }
  if(!/^https:\/\/[a-z0-9.-]+(?::443)?$/i.test(origin)||!Number.isSafeInteger(Number(integration))||Number(integration)<=0)
    return response({error:"Payment configuration is invalid."},503);
  const authHeader=request.headers.get("authorization")||"";
  const match=/^Bearer\s+(.+)$/i.exec(authHeader);
  if(!match)return response({error:"Please sign in to continue."},401);
  const jwt=match[1];
  const client=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+jwt}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:identity,error:authError}=await client.auth.getUser(jwt);
  if(authError||!identity?.user)return response({error:"Your session expired. Please sign in."},401);
  const input=await request.json();
  const {companyId,priceId}=input||{};
  const customer=input?.customer||{};
  if(!/^[0-9a-f-]{36}$/i.test(String(companyId||""))||!/^[0-9a-f-]{36}$/i.test(String(priceId||"")))
   return response({error:"Invalid company or plan."},400);
  const firstName=String(customer.firstName||"").trim().slice(0,80);
  const lastName=String(customer.lastName||"").trim().slice(0,80);
  const phone=String(customer.phone||"").trim();
  const email=identity.user.email||"";
  if(!firstName||!lastName||! /^\+?[0-9 ()-]{8,22}$/.test(phone)||!email)
   return response({error:"Enter your first name, last name and valid phone number."},400);
  const {data:chosen,error:priceError}=await client.from("billing_plan_prices")
    .select("id,currency,is_active,amount_minor").eq("id",priceId).maybeSingle();
  if(priceError)return response({error:priceError.message},400);
  if(!chosen?.is_active||chosen.currency!==region.currency)return response({error:"This plan is not available for the configured merchant region."},400);
  admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:created,error:createError}=await client.rpc("billing_start_checkout",{
   p_company_id:companyId,p_price_id:priceId,p_provider_mode:mode
  });
  if(createError)return response({error:createError.message},403);
  reserved=created;
  const payload={
   amount:Number(created.amount_minor),
   currency:created.currency,
   payment_methods:[Number(integration)],
   items:[{name:"Inspire Match "+created.plan_id+" subscription",amount:Number(created.amount_minor),description:"Subscription checkout",quantity:1}],
   billing_data:{
    first_name:firstName,last_name:lastName,email,phone_number:phone,
    apartment:"NA",floor:"NA",street:"NA",building:"NA",city:"NA",state:"NA",
    country:region.country,postal_code:"NA",shipping_method:"NA"
   },
   customer:{first_name:firstName,last_name:lastName,email},
   special_reference:created.invoice_id,
   notification_url:origin+"/api/billing/paymob/webhook",
   redirection_url:origin+"/app/billing?payment=returned",
   expiration:3600
  };
  const gateway=await fetch(region.base+"/v1/intention/",{
   method:"POST",headers:{Authorization:"Token "+secret,"Content-Type":"application/json"},
   body:JSON.stringify(payload),cache:"no-store",signal:AbortSignal.timeout(18000)
  });
  const data=await gateway.json().catch(()=>({}));
  if(!gateway.ok||!data.client_secret||!data.intention_order_id||!data.id){
   console.error("Paymob intention failed",gateway.status);
   throw new Error("Payment provider could not start checkout. Try again later.");
  }
  const {error:writeError}=await admin.from("billing_checkout_sessions")
   .update({provider_order_id:String(data.intention_order_id),provider_intention_id:String(data.id),status:"pending"})
   .eq("id",created.checkout_id).eq("status","initiated");
  if(writeError)throw new Error("Could not securely register the payment request.");
  const {error:invoiceError}=await admin.from("billing_invoices")
   .update({provider_order_id:String(data.intention_order_id)}).eq("id",created.invoice_id).eq("status","pending");
  if(invoiceError)throw new Error("Could not securely register the payment reference.");
  const checkout=new URL(region.base+"/unifiedcheckout/");
  checkout.searchParams.set("publicKey",publicKey);
  checkout.searchParams.set("clientSecret",data.client_secret);
  return response({checkoutUrl:checkout.toString()});
 }catch(error){
  console.error("Billing checkout error:",error?.message);
  if(reserved&&admin){
   await admin.from("billing_checkout_sessions").update({status:"failed"}).eq("id",reserved.checkout_id).eq("status","initiated");
   await admin.from("billing_invoices").update({status:"failed"}).eq("id",reserved.invoice_id).eq("status","pending");
  }
  return response({error:error?.message||"Unable to create checkout."},500);
 }
}
