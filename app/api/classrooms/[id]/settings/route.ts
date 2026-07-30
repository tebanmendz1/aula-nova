import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getRequestUser } from "@/lib/api-auth";
import { newInviteCode } from "@/lib/invite-code";

async function owned(id:string,user:{sub:string;role:string}) {
  return prisma.classroom.findFirst({where:{id,...(user.role==="TEACHER"?{teacherId:user.sub}:user.role==="ADMIN"?{}:{id:"__none__"})},select:{id:true}});
}
const schema=z.object({title:z.string().trim().min(3).max(100),description:z.string().trim().max(500),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),status:z.enum(["DRAFT","ACTIVE","ARCHIVED"]),invitationMode:z.enum(["SINGLE_USE","REUSABLE","CLOSED"])});

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await getRequestUser(request),{id}=await params;if(!user||!await owned(id,user))return NextResponse.json({error:"Sin permiso"},{status:403});
  const classroom=await prisma.classroom.findUnique({where:{id},select:{id:true,title:true,description:true,color:true,status:true,inviteCode:true,invitationMode:true,_count:{select:{enrollments:true,modules:true}}}});
  return NextResponse.json({classroom});
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await getRequestUser(request),{id}=await params;if(!user||!await owned(id,user))return NextResponse.json({error:"Sin permiso"},{status:403});
  const body=await request.json();
  if(body.regenerateCode){const classroom=await prisma.classroom.update({where:{id},data:{inviteCode:newInviteCode()},select:{inviteCode:true}});return NextResponse.json({classroom});}
  const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"Revisa la configuración del curso."},{status:400});
  const classroom=await prisma.classroom.update({where:{id},data:parsed.data,select:{id:true,title:true,description:true,color:true,status:true,inviteCode:true,invitationMode:true}});
  return NextResponse.json({classroom});
}
