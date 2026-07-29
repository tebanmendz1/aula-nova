import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export async function GET(request:NextRequest){const raw=request.nextUrl.searchParams.get("token");if(raw){const user=await prisma.user.findFirst({where:{emailVerificationToken:hashToken(raw),emailVerificationExpires:{gt:new Date()}},select:{id:true}});if(user)await prisma.user.update({where:{id:user.id},data:{emailVerifiedAt:new Date(),emailVerificationToken:null,emailVerificationExpires:null}})}return NextResponse.redirect(new URL("/login?verified=1",request.url))}
