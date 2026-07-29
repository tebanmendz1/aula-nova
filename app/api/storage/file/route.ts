import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { storageBucket,storageClient } from "@/lib/storage";

export async function GET(request:NextRequest){
  const user=await getRequestUser(request);if(!user)return NextResponse.json({error:"No autorizado"},{status:401});
  const key=request.nextUrl.searchParams.get("key")||"";const classroomId=key.split("/")[0];
  const access=user.role==="ADMIN"||!!(await prisma.classroom.findFirst({where:{id:classroomId,OR:[{teacherId:user.sub},{enrollments:{some:{studentId:user.sub,status:"ACTIVE"}}}]},select:{id:true}}));
  if(!access)return NextResponse.json({error:"Acceso restringido"},{status:403});
  try{const object=await storageClient().send(new GetObjectCommand({Bucket:storageBucket(),Key:key}));const bytes=await object.Body?.transformToByteArray();return new NextResponse(bytes?Buffer.from(bytes):null,{headers:{"Content-Type":object.ContentType||"application/octet-stream","Content-Disposition":"inline","Cache-Control":"private, max-age=3600"}})}catch{return NextResponse.json({error:"Archivo no encontrado"},{status:404})}
}
