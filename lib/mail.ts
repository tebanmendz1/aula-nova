import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export function mailEnabled(){return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASSWORD&&process.env.MAIL_FROM)}

export async function sendMail(to:string,subject:string,html:string){
  if(!mailEnabled()){console.warn("SMTP no configurado; correo omitido para",to);return false}
  const options:SMTPTransport.Options={host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==="true",auth:{user:process.env.SMTP_USER!,pass:process.env.SMTP_PASSWORD!}};
  const transporter=nodemailer.createTransport(options);
  await transporter.sendMail({from:process.env.MAIL_FROM,to,subject,html});return true;
}

export function appUrl(){return (process.env.APP_URL||"http://localhost:3000").replace(/\/$/,"")}
