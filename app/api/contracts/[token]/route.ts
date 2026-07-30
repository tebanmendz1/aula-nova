import {NextRequest,NextResponse} from "next/server";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {prisma} from "@/lib/prisma";
import {hashToken} from "@/lib/tokens";
import {storageBucket,storageClient} from "@/lib/storage";
import {clientIp} from "@/lib/rate-limit";
import {generateSignedContractPdf} from "@/lib/signed-contract-pdf";
import {sendMail} from "@/lib/mail";

async function find(raw:string){return prisma.contractAcceptance.findUnique({where:{tokenHash:hashToken(raw)},include:{student:{select:{name:true,accountType:true,guardianName:true}},enrollment:{include:{classroom:{select:{title:true,teacher:{select:{name:true,email:true}}}}}}}})}

export async function GET(_:NextRequest,{params}:{params:Promise<{token:string}>}){const {token}=await params,a=await find(token);if(!a)return NextResponse.json({error:"Enlace inválido"},{status:404});return NextResponse.json({contract:{title:a.contractTitle,content:a.contractSnapshot,studentName:a.student.name,signerName:a.student.accountType==="MINOR"?a.student.guardianName:a.student.name,course:a.enrollment.classroom.title,teacher:a.enrollment.classroom.teacher.name,expiresAt:a.expiresAt,signedAt:a.signedAt}})}

export async function POST(request:NextRequest,{params}:{params:Promise<{token:string}>}){
  const {token}=await params,a=await find(token);
  if(!a)return NextResponse.json({error:"Enlace inválido"},{status:404});
  if(a.signedAt)return NextResponse.json({error:"Este contrato ya fue firmado"},{status:409});
  if(a.expiresAt<new Date())return NextResponse.json({error:"El enlace venció; solicita uno nuevo"},{status:410});
  const form=await request.formData(),signerName=String(form.get("signerName")||"").trim(),consent=form.get("consent"),signature=form.get("signature");
  if(signerName.length<3||consent!=="true"||!(signature instanceof File))return NextResponse.json({error:"Completa la firma y la aceptación del contrato"},{status:400});
  if(signature.type!=="image/png"||signature.size>2*1024*1024)return NextResponse.json({error:"La firma debe ser una imagen PNG de hasta 2 MB"},{status:415});
  const signatureBytes=new Uint8Array(await signature.arrayBuffer()),prefix=`contracts/${a.id}`,keys={signatureKey:`${prefix}/signature.png`,idFrontKey:null,idBackKey:null},s3=storageClient();
  await s3.send(new PutObjectCommand({Bucket:storageBucket(),Key:keys.signatureKey,Body:signatureBytes,ContentType:signature.type}));
  const signedAt=new Date(),ipAddress=clientIp(request);
  await prisma.$transaction([prisma.contractAcceptance.update({where:{id:a.id},data:{...keys,signerName,signedAt,ipAddress,userAgent:request.headers.get("user-agent")?.slice(0,500)}}),prisma.enrollment.update({where:{id:a.enrollmentId},data:{status:"ACTIVE"}})]);
  let mailed={signer:false,teacher:false};
  try{
    const pdf=await generateSignedContractPdf({title:a.contractTitle,content:a.contractSnapshot,course:a.enrollment.classroom.title,teacher:a.enrollment.classroom.teacher.name,student:a.student.name,signer:signerName,signerEmail:a.signerEmail,signedAt,ipAddress,signature:signatureBytes}),attachment={filename:`contrato-firmado-${a.enrollment.classroom.title.replace(/[^a-zA-Z0-9-]/g,"-")}.pdf`,content:pdf,contentType:"application/pdf"},subject=`Contrato firmado — ${a.enrollment.classroom.title}`,html=`<h2>Contrato firmado correctamente</h2><p>Adjuntamos la copia PDF firmada del contrato de <b>${a.student.name}</b> para el curso <b>${a.enrollment.classroom.title}</b>.</p>`;
    [mailed.signer,mailed.teacher]=await Promise.all([sendMail(a.signerEmail,subject,html,[attachment]),sendMail(a.enrollment.classroom.teacher.email,subject,html,[attachment])]);
  }catch(error){console.error("signed_contract_email_error",error)}
  return NextResponse.json({ok:true,mailed});
}
