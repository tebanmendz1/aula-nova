import {PDFDocument,PDFFont,PDFPage,StandardFonts,rgb} from "pdf-lib";

type Input={title:string;content:string;course:string;teacher:string;student:string;signer:string;signerEmail:string;signedAt:Date;ipAddress:string;signature:Uint8Array};
const clean=(value:string)=>value.replace(/[—–]/g,"-").replace(/“|”/g,'"').replace(/’/g,"'").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g,"");
function wrap(text:string,font:PDFFont,size:number,width:number){const words=clean(text).split(/\s+/),lines:string[]=[];let current="";for(const word of words){const next=current?`${current} ${word}`:word;if(font.widthOfTextAtSize(next,size)>width&&current){lines.push(current);current=word}else current=next}if(current)lines.push(current);return lines}

export async function generateSignedContractPdf(input:Input){
  const pdf=await PDFDocument.create(),regular=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  let page=undefined as unknown as PDFPage,y=0;
  const newPage=()=>{page=pdf.addPage([595.28,841.89]);y=800;page.drawText("AulaNova - Contrato firmado",{x:45,y,font:bold,size:10,color:rgb(.38,.31,.78)});y-=30};
  const line=(text:string,size=10,strong=false,space=15)=>{const font=strong?bold:regular;for(const row of wrap(text,font,size,505)){if(y<70)newPage();page.drawText(row,{x:45,y,font,size,color:rgb(.13,.12,.17)});y-=space}};
  newPage();line(input.title,18,true,24);y-=5;line(`Curso: ${input.course}`,11,true);line(`Docente: ${input.teacher}`);line(`Estudiante: ${input.student}`);line(`Firmante: ${input.signer} (${input.signerEmail})`);line(`Fecha de firma: ${input.signedAt.toLocaleString("es-BO",{timeZone:"America/La_Paz"})}`);y-=12;
  for(const paragraph of input.content.split("\n")){if(!paragraph.trim()){y-=8;continue}line(paragraph,10,paragraph.startsWith("IMPORTANTE"),15);y-=5}
  if(y<230)newPage();y-=8;line("Firma manuscrita electrónica",11,true);const image=await pdf.embedPng(input.signature),dimensions=image.scaleToFit(280,110);page.drawImage(image,{x:45,y:y-dimensions.height,width:dimensions.width,height:dimensions.height});y-=dimensions.height+18;line(`Registro técnico de aceptación: IP ${input.ipAddress||"no disponible"}`,8);
  return Buffer.from(await pdf.save());
}
