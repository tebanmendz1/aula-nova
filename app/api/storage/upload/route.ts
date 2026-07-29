import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { storageBucket,storageClient } from "@/lib/storage";

const allowed=new Set(["application/pdf","image/png","image/jpeg","image/webp","video/mp4","audio/mpeg","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.presentationml.presentation"]);

export async function POST(request:NextRequest){
  const user=await getRequestUser(request);if(!user)return NextResponse.json({error:"No autorizado"},{status:401});
  const form=await request.formData();const file=form.get("file");const classroomId=String(form.get("classroomId")||"");
  if(!(file instanceof File)||!classroomId)return NextResponse.json({error:"Archivo o aula inválidos."},{status:400});
  if(file.size>25*1024*1024)return NextResponse.json({error:"El archivo supera el límite de 25 MB."},{status:413});
  if(!allowed.has(file.type))return NextResponse.json({error:"Tipo de archivo no permitido."},{status:415});
  const access=user.role==="ADMIN"||!!(await prisma.classroom.findFirst({where:{id:classroomId,OR:[{teacherId:user.sub},{enrollments:{some:{studentId:user.sub,status:"ACTIVE"}}}]},select:{id:true}}));
  if(!access)return NextResponse.json({error:"No tienes acceso a esta aula."},{status:403});
  const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const key=`${classroomId}/${user.sub}/${crypto.randomUUID()}-${safe}`;
  await storageClient().send(new PutObjectCommand({Bucket:storageBucket(),Key:key,Body:new Uint8Array(await file.arrayBuffer()),ContentType:file.type,Metadata:{original:file.name}}));
  return NextResponse.json({url:`/api/storage/file?key=${encodeURIComponent(key)}`,name:file.name,size:file.size});
}
