import { prisma } from "@/lib/prisma";
export async function notifyClassroom(classroomId:string,title:string,body:string,href?:string){const students=await prisma.enrollment.findMany({where:{classroomId,status:"ACTIVE"},select:{studentId:true}});if(students.length)await prisma.notification.createMany({data:students.map(({studentId})=>({userId:studentId,title,body,href}))})}
export async function notifyUser(userId:string,title:string,body:string,href?:string){await prisma.notification.create({data:{userId,title,body,href}})}
