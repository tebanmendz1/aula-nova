import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { notifyClassroom,notifyUser } from "@/lib/notifications";

async function owned(classroomId:string,user:{sub:string;role:string}) { return user.role==="ADMIN" || !!(await prisma.classroom.findFirst({where:{id:classroomId,teacherId:user.sub},select:{id:true}})); }
async function enrolled(classroomId:string,userId:string) { return !!(await prisma.enrollment.findFirst({where:{classroomId,studentId:userId,status:"ACTIVE"},select:{id:true}})); }

export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}) {
  const user=await getRequestUser(request); if(!user)return NextResponse.json({error:"No autorizado"},{status:401});
  const {id}=await context.params; const body=await request.json(); const action=String(body.action||"");
  try {
    if(["module","lesson","resource","activity","announcement","grade"].includes(action) && !(await owned(id,user))) return NextResponse.json({error:"No tienes permiso para editar esta aula."},{status:403});
    if(action==="module") { const position=await prisma.module.count({where:{classroomId:id}})+1; await prisma.module.create({data:{title:String(body.title).trim(),classroomId:id,position,published:true}}); }
    else if(action==="lesson") { const module=await prisma.module.findFirst({where:{id:String(body.moduleId),classroomId:id}}); if(!module)throw new Error("Módulo inválido"); const position=await prisma.lesson.count({where:{moduleId:module.id}})+1; await prisma.lesson.create({data:{title:String(body.title).trim(),content:{text:String(body.content||"")},moduleId:module.id,position,published:true}}); }
    else if(action==="resource") { const lesson=await prisma.lesson.findFirst({where:{id:String(body.lessonId),module:{classroomId:id}}}); if(!lesson)throw new Error("Lección inválida"); await prisma.resource.create({data:{title:String(body.title).trim(),url:String(body.url).trim(),type:body.type||"LINK",lessonId:lesson.id}}); }
    else if(action==="activity") { const lesson=await prisma.lesson.findFirst({where:{id:String(body.lessonId),module:{classroomId:id}}}); if(!lesson)throw new Error("Lección inválida"); const activity=await prisma.activity.create({data:{title:String(body.title).trim(),description:String(body.description||""),type:body.type||"ASSIGNMENT",dueAt:body.dueAt?new Date(body.dueAt):null,maxScore:Number(body.maxScore||100),lessonId:lesson.id}}); await notifyClassroom(id,"Nueva actividad",activity.title,`/aulas/${id}`); }
    else if(action==="announcement") { const announcement=await prisma.announcement.create({data:{title:String(body.title).trim(),body:String(body.body).trim(),classroomId:id}}); await notifyClassroom(id,announcement.title,announcement.body,`/aulas/${id}`); }
    else if(action==="submission") { if(user.role!=="STUDENT"||!(await enrolled(id,user.sub)))return NextResponse.json({error:"No puedes entregar en esta aula."},{status:403}); const activity=await prisma.activity.findFirst({where:{id:String(body.activityId),lesson:{module:{classroomId:id}}}}); if(!activity)throw new Error("Actividad inválida"); await prisma.submission.upsert({where:{activityId_studentId:{activityId:activity.id,studentId:user.sub}},create:{activityId:activity.id,studentId:user.sub,content:String(body.content||""),fileUrl:body.fileUrl?String(body.fileUrl):null},update:{content:String(body.content||""),fileUrl:body.fileUrl?String(body.fileUrl):null,submittedAt:new Date(),score:null,feedback:null,gradedAt:null}}); }
    else if(action==="grade") { const submission=await prisma.submission.findFirst({where:{id:String(body.submissionId),activity:{lesson:{module:{classroomId:id}}}},select:{id:true,studentId:true,activity:{select:{title:true}}}}); if(!submission)throw new Error("Entrega inválida"); const score=Math.max(0,Number(body.score)); await prisma.submission.update({where:{id:submission.id},data:{score,feedback:String(body.feedback||""),gradedAt:new Date()}}); await notifyUser(submission.studentId,"Actividad calificada",`${submission.activity.title}: ${score} puntos`,`/aulas/${id}`); }
    else return NextResponse.json({error:"Acción inválida."},{status:400});
    return NextResponse.json({ok:true});
  } catch(error){console.error("classroom_content_error",error);return NextResponse.json({error:"No se pudo guardar la información."},{status:400})}
}
