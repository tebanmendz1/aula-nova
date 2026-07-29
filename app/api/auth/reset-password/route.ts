import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function POST(request:Request){
  const parsed=z.object({token:z.string().min(20),password:z.string().min(8).max(72)}).safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Solicitud inválida."},{status:400});
  const user=await prisma.user.findFirst({where:{passwordResetToken:hashToken(parsed.data.token),passwordResetExpires:{gt:new Date()}},select:{id:true}});if(!user)return NextResponse.json({error:"El enlace venció o ya fue utilizado."},{status:400});
  await prisma.user.update({where:{id:user.id},data:{passwordHash:await hash(parsed.data.password,12),passwordResetToken:null,passwordResetExpires:null}});return NextResponse.json({ok:true});
}
