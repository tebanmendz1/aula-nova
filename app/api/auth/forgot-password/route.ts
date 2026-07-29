import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { appUrl, sendMail } from "@/lib/mail";
import { newToken } from "@/lib/tokens";

export async function POST(request:Request){
  const parsed=z.object({email:z.string().trim().toLowerCase().email()}).safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({ok:true});
  const user=await prisma.user.findUnique({where:{email:parsed.data.email},select:{id:true,name:true,email:true}});
  if(user){const token=newToken();await prisma.user.update({where:{id:user.id},data:{passwordResetToken:token.hash,passwordResetExpires:new Date(Date.now()+60*60*1000)}});const link=`${appUrl()}/restablecer/${token.raw}`;await sendMail(user.email,"Restablece tu contraseña de AulaNova",`<h2>Hola, ${user.name}</h2><p>Usa el siguiente enlace para crear una contraseña nueva. El enlace vence en una hora.</p><p><a href="${link}">Restablecer contraseña</a></p>`)}
  return NextResponse.json({ok:true});
}
