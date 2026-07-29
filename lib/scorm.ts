import AdmZip from "adm-zip";

export type ScormFile={path:string;data:Uint8Array};
function safePath(input:string){const value=input.replaceAll("\\","/").replace(/^\.\//,"");if(!value||value.startsWith("/")||value.split("/").includes(".."))throw new Error("Ruta insegura en el paquete");return value}

export async function unpackScorm(name:string,buffer:ArrayBuffer):Promise<{files:ScormFile[];launch:string}>{
  const files:ScormFile[]=[];
  if(name.toLowerCase().endsWith(".rar")){
    const {createExtractorFromData}=await import("node-unrar-js");
    const extracted=createExtractorFromData?await createExtractorFromData({data:buffer}):null;
    if(!extracted)throw new Error("No se pudo abrir el RAR");
    for(const item of extracted.extract().files){if(!item.fileHeader.flags.directory&&item.extraction)files.push({path:safePath(item.fileHeader.name),data:item.extraction})}
  }else{
    const archive=new AdmZip(Buffer.from(buffer));
    for(const entry of archive.getEntries()){if(!entry.isDirectory)files.push({path:safePath(entry.entryName),data:new Uint8Array(entry.getData())})}
  }
  if(!files.length||files.length>1500)throw new Error("Cantidad de archivos inválida");
  const total=files.reduce((sum,file)=>sum+file.data.byteLength,0);if(total>150*1024*1024)throw new Error("El paquete extraído supera 150 MB");
  const manifest=files.find(file=>file.path.toLowerCase()==="imsmanifest.xml");if(!manifest)throw new Error("No se encontró imsmanifest.xml en la raíz");
  const xml=new TextDecoder().decode(manifest.data);const href=xml.match(/<resource\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
  const launch=safePath(href||"index.html");if(!files.some(file=>file.path===launch))throw new Error("El archivo de inicio indicado por el manifiesto no existe");
  return {files,launch};
}

export function scormMime(path:string){const ext=path.split(".").pop()?.toLowerCase();return ({html:"text/html; charset=utf-8",htm:"text/html; charset=utf-8",js:"text/javascript; charset=utf-8",mjs:"text/javascript; charset=utf-8",css:"text/css; charset=utf-8",json:"application/json",xml:"application/xml",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",svg:"image/svg+xml",webp:"image/webp",mp3:"audio/mpeg",mp4:"video/mp4",wav:"audio/wav",woff:"font/woff",woff2:"font/woff2",pdf:"application/pdf"} as Record<string,string>)[ext||""]||"application/octet-stream"}
