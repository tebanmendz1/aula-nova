import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const where = user.role === "ADMIN" ? {} : user.role === "TEACHER"
    ? { teacherId: user.sub }
    : { enrollments: { some: { studentId: user.sub, status: "ACTIVE" as const } } };
  const classrooms = await prisma.classroom.findMany({
    where,
    select: {
      id:true, title:true, inviteCode:true, status:true, color:true,
      _count:{select:{enrollments:true,modules:true}},
      enrollments:user.role==="STUDENT"?{where:{studentId:user.sub},select:{progress:true}}:false,
    },
    orderBy:{updatedAt:"desc"}, take:6,
  });
  const ids=classrooms.map(item=>item.id);
  const [students,pending,graded,upcoming]=await Promise.all([
    user.role==="ADMIN"?prisma.user.count({where:{role:"STUDENT",active:true}}):user.role==="TEACHER"?prisma.enrollment.count({where:{classroom:{teacherId:user.sub},status:"ACTIVE"}}):Promise.resolve(classrooms.length),
    user.role==="STUDENT"?prisma.activity.count({where:{lesson:{module:{classroomId:{in:ids}}},submissions:{none:{studentId:user.sub}}}}):prisma.submission.count({where:{score:null,activity:{lesson:{module:{classroomId:{in:ids}}}}}}),
    user.role==="STUDENT"?prisma.submission.aggregate({where:{studentId:user.sub,score:{not:null}},_avg:{score:true}}):prisma.submission.aggregate({where:{score:{not:null},activity:{lesson:{module:{classroomId:{in:ids}}}}},_avg:{score:true}}),
    prisma.activity.findMany({
      where:{dueAt:{gte:new Date()},lesson:{module:{classroomId:{in:ids}}}},
      select:{id:true,title:true,dueAt:true,lesson:{select:{module:{select:{classroom:{select:{title:true,color:true}}}}}}},
      orderBy:{dueAt:"asc"},take:4,
    }),
  ]);
  return NextResponse.json({
    stats:{activeClassrooms:classrooms.filter(item=>item.status==="ACTIVE").length,students,pending,average:Math.round(graded._avg.score??0)},
    classrooms:classrooms.map(item=>({...item,progress:user.role==="STUDENT"?(item.enrollments[0]?.progress??0):0})),
    upcoming:upcoming.map(item=>({id:item.id,title:item.title,date:item.dueAt,classroom:item.lesson.module.classroom})),
  });
}
