import {NextRequest,NextResponse} from "next/server";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {getRequestUser} from "@/lib/api-auth";
import {prisma} from "@/lib/prisma";
import {unpackScorm,scormMime} from "@/lib/scorm";
import {storageBucket,storageClient} from "@/lib/storage";

export const runtime="nodejs";
export async function POST(request:NextRequest){
  const user=await getRequestUser(request);
  if(!user||user.role==="STUDENT")return NextResponse.json({error:"Sin permiso"},{status:403});
  const form=await request.formData(),file=form.get("file"),classroomId=String(form.get("classroomId")||""),lessonId=String(form.get("lessonId")||""),title=String(form.get("title")||"").trim();
  if(!(file instanceof File)||!title||!/[.](zip|rar)$/i.test(file.name))return NextResponse.json({error:"Selecciona un paquete SCORM .zip o .rar."},{status:400});
  if(file.size>50*1024*1024)return NextResponse.json({error:"El paquete supera 50 MB."},{status:413});
  const lesson=await prisma.lesson.findFirst({where:{id:lessonId,module:{classroom:{id:classroomId,...(user.role==="TEACHER"?{teacherId:user.sub}:{})}}},select:{id:true}});
  if(!lesson)return NextResponse.json({error:"Aula o lección inválida."},{status:403});
  try{
    const unpacked=await unpackScorm(file.name,await file.arrayBuffer()),resourceId=crypto.randomUUID(),prefix=`scorm/${classroomId}/${resourceId}`,client=storageClient();
    for(const item of unpacked.files)await client.send(new PutObjectCommand({Bucket:storageBucket(),Key:`${prefix}/${item.path}`,Body:item.data,ContentType:scormMime(item.path)}));
    const url=`/scorm/${resourceId}?launch=${encodeURIComponent(unpacked.launch)}`;
    const resource=await prisma.resource.create({data:{id:resourceId,title,type:"INTERACTIVE",url,lessonId:lesson.id}});
    return NextResponse.json({resource},{status:201});
  }catch(error){console.error("scorm_upload_error",error);return NextResponse.json({error:error instanceof Error?error.message:"No se pudo importar el paquete SCORM."},{status:400})}
}
