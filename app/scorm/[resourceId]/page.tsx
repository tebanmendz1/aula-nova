"use client";
import {use,useEffect} from "react";
import {useSearchParams} from "next/navigation";

export default function ScormPlayer({params}:{params:Promise<{resourceId:string}>}){
  const{resourceId}=use(params),search=useSearchParams(),launch=search.get("launch")||"index.html";
  useEffect(()=>{const values:Record<string,string>={"cmi.core.lesson_status":"incomplete","cmi.completion_status":"incomplete"};const api={LMSInitialize:()=>"true",LMSFinish:()=>"true",LMSGetValue:(key:string)=>values[key]||"",LMSSetValue:(key:string,value:string)=>(values[key]=String(value),"true"),LMSCommit:()=>"true",LMSGetLastError:()=>"0",LMSGetErrorString:()=>"No error",LMSGetDiagnostic:()=>"No error",Initialize:()=>"true",Terminate:()=>"true",GetValue:(key:string)=>values[key]||"",SetValue:(key:string,value:string)=>(values[key]=String(value),"true"),Commit:()=>"true",GetLastError:()=>"0",GetErrorString:()=>"No error",GetDiagnostic:()=>"No error"};Object.assign(window,{API:api,API_1484_11:api})},[]);
  return <main style={{position:"fixed",inset:0,background:"white"}}><iframe title="Contenido SCORM" src={`/api/scorm/${resourceId}/${launch.split("/").map(encodeURIComponent).join("/")}`} allow="fullscreen; autoplay" style={{width:"100%",height:"100%",border:0}}/></main>;
}
