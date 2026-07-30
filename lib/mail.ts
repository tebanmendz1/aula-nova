import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export function mailEnabled(){return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.MAIL_FROM)}

export async function sendMail(to:string,subject:string,html:string){
  if(!mailEnabled()){console.warn("SMTP no configurado; correo omitido para",to);return false}
  const options:SMTPTransport.Options={host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==="true",connectionTimeout:8_000,greetingTimeout:8_000,socketTimeout:12_000,auth:{user:process.env.SMTP_USER!,pass:process.env.SMTP_PASSWORD!}};
  const transporter=nodemailer.createTransport(options);
  try { await transporter.sendMail({from:process.env.MAIL_FROM,to,subject,html}); return true; }
  catch(error) { console.error("smtp_delivery_error",error); return false; }
}

export function appUrl(){return (process.env.APP_URL||"http://localhost:3000").replace(/\/$/,"")}

export function publicAppUrl(request:Request){
  if(process.env.APP_URL)return process.env.APP_URL.replace(/\/$/,"");
  const host=request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()||request.headers.get("host");
  const protocol=request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim()||"https";
  return host?`${protocol}://${host}`.replace(/\/$/,""):new URL(request.url).origin;
}
