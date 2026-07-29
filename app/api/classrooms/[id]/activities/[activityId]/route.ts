import {NextRequest,NextResponse} from "next/server";
import {getRequestUser} from "@/lib/api-auth";
import {notifyUser} from "@/lib/notifications";
import {prisma} from "@/lib/prisma";

async function getContext(id:string,activityId:string,user:{sub:string;role:string}){
  const classroom=await prisma.classroom.findFirst({
    where:{id,OR:[...(user.role==="ADMIN"?[{}]:[]),{teacherId:user.sub},{enrollments:{some:{studentId:user.sub,status:"ACTIVE"}}}]},
    select:{id:true,title:true,teacherId:true,enrollments:{where:{status:"ACTIVE"},select:{student:{select:{id:true,name:true,email:true}}}}},
  });
  if(!classroom)return null;
  const activity=await prisma.activity.findFirst({
    where:{id:activityId,lesson:{module:{classroomId:id}}},
    include:{lesson:{select:{title:true,module:{select:{title:true}}}},submissions:{where:user.role==="STUDENT"?{studentId:user.sub}:{},include:{student:{select:{id:true,name:true,email:true}}},orderBy:{updatedAt:"desc"}}},
  });
  return activity?{classroom,activity}:null;
}
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string;activityId:string}>}){const user=await getRequestUser(request);if(!user)return NextResponse.json({error:"No autorizado"},{status:401});const{id,activityId}=await params,data=await getContext(id,activityId,user);if(!data)return NextResponse.json({error:"Tarea no encontrada"},{status:404});return NextResponse.json({...data,role:user.role,userId:user.sub})}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string;activityId:string}>}){
  const user=await getRequestUser(request);if(!user)return NextResponse.json({error:"No autorizado"},{status:401});const{id,activityId}=await params,data=await getContext(id,activityId,user);if(!data)return NextResponse.json({error:"Tarea no encontrada"},{status:404});const body=await request.json(),action=String(body.action||"");
  try{
    if(action==="save_draft"||action==="submit"){
      if(user.role!=="STUDENT")return NextResponse.json({error:"Solo los alumnos entregan tareas"},{status:403});const existing=data.activity.submissions[0];if(existing?.status==="SUBMITTED")return NextResponse.json({error:"La entrega está bloqueada. Solicita al docente que la reabra."},{status:409});const status=action==="submit"?"SUBMITTED":existing?.status==="REOPENED"?"REOPENED":"DRAFT";
      const submission=await prisma.submission.upsert({where:{activityId_studentId:{activityId,studentId:user.sub}},create:{activityId,studentId:user.sub,content:String(body.content||""),fileUrl:body.fileUrl?String(body.fileUrl):null,status,submittedAt:new Date()},update:{content:String(body.content||""),fileUrl:body.fileUrl===undefined?existing?.fileUrl:body.fileUrl?String(body.fileUrl):null,status,submittedAt:action==="submit"?new Date():existing?.submittedAt}});return NextResponse.json({submission});
    }
    if(user.role==="STUDENT"||(user.role==="TEACHER"&&data.classroom.teacherId!==user.sub))return NextResponse.json({error:"Sin permiso"},{status:403});const submission=await prisma.submission.findFirst({where:{id:String(body.submissionId),activityId},include:{student:{select:{id:true}}}});if(!submission)return NextResponse.json({error:"Entrega no encontrada"},{status:404});
    if(action==="grade"){if(submission.status!=="SUBMITTED")return NextResponse.json({error:"Solo se califican entregas definitivas"},{status:409});const score=Number(body.score);if(!Number.isFinite(score)||score<0||score>data.activity.maxScore)return NextResponse.json({error:`La nota debe estar entre 0 y ${data.activity.maxScore}`},{status:400});await prisma.submission.update({where:{id:submission.id},data:{score,feedback:String(body.feedback||""),gradedAt:new Date()}});await notifyUser(submission.student.id,"Tarea calificada",`${data.activity.title}: ${score}/${data.activity.maxScore}`,`/aulas/${id}/tareas/${activityId}`)}else if(action==="reopen")await prisma.submission.update({where:{id:submission.id},data:{status:"REOPENED",gradedAt:null}});else return NextResponse.json({error:"Acción inválida"},{status:400});return NextResponse.json({ok:true});
  }catch(error){console.error("assignment_workflow_error",error);return NextResponse.json({error:"No se pudo actualizar la tarea"},{status:400})}
}
