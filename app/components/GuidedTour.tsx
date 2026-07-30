"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type Role="Alumno"|"Docente"|"Administrador";
type Step={target:string;title:string;body:string};
const common:Step[]=[
  {target:".welcome",title:"Bienvenido a AulaNova",body:"Este panel reúne tus aulas, actividad reciente y accesos más importantes."},
  {target:".sidebar nav",title:"Navegación principal",body:"Desde aquí puedes abrir tus aulas, calendario, notificaciones, recursos y calificaciones."},
  {target:".stats",title:"Resumen de actividad",body:"Consulta rápidamente aulas activas, pendientes, participantes y progreso general."},
  {target:".course-grid",title:"Tus espacios de aprendizaje",body:"Selecciona una tarjeta para entrar al aula, revisar contenidos y continuar trabajando."},
  {target:".activity-panel",title:"Agenda académica",body:"Aquí aparecen las clases, entregas y eventos más próximos."},
];
const finalByRole:Record<Role,Step>={
  Alumno:{target:".primary",title:"Únete a una nueva aula",body:"Usa un código de invitación para matricularte en otra aula."},
  Docente:{target:".primary",title:"Crea tu primera aula",body:"Después podrás organizar unidades y arrastrar recursos o actividades desde el editor."},
  Administrador:{target:".primary",title:"Gestiona la plataforma",body:"Crea usuarios, asigna roles y supervisa las aulas desde el panel administrativo."},
};

export default function GuidedTour(){
  const [role,setRole]=useState<Role|null>(null);
  useEffect(()=>{if(location.pathname!=="/")return;let help:HTMLButtonElement|null=null;const restart=()=>window.dispatchEvent(new Event("aulanova:start-tour"));fetch("/api/auth/me").then(response=>response.json()).then(data=>{if(data.user)setRole(data.user.role==="ADMIN"?"Administrador":data.user.role==="TEACHER"?"Docente":"Alumno")}).catch(()=>{});const timer=setTimeout(()=>{help=document.querySelector<HTMLButtonElement>(".sidebar-bottom button:first-child");help?.addEventListener("click",restart)},300);return()=>{clearTimeout(timer);help?.removeEventListener("click",restart)}},[]);
  return role?<Tour role={role}/>:null;
}

function Tour({role}:{role:Role}){
  const steps=useMemo(()=>[...common,finalByRole[role]],[role]),[open,setOpen]=useState(false),[index,setIndex]=useState(0),[rect,setRect]=useState<DOMRect|null>(null),storageKey=`aulanova-tour-v1-${role.toLowerCase()}`;
  function finish(){localStorage.setItem(storageKey,"completed");setOpen(false)}
  function next(){if(index>=steps.length-1)finish();else setIndex(value=>value+1)}
  useEffect(()=>{if(!localStorage.getItem(storageKey)){setIndex(0);setOpen(true)}const restart=()=>{setIndex(0);setOpen(true)};window.addEventListener("aulanova:start-tour",restart);return()=>window.removeEventListener("aulanova:start-tour",restart)},[storageKey]);
  useEffect(()=>{if(!open)return;const update=()=>{const element=document.querySelector(steps[index].target);if(element){element.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>setRect(element.getBoundingClientRect()),220)}else setRect(null)};update();window.addEventListener("resize",update);window.addEventListener("scroll",update,true);const keyboard=(event:KeyboardEvent)=>{if(event.key==="Escape")finish();if(event.key==="ArrowRight")next();if(event.key==="ArrowLeft")setIndex(value=>Math.max(0,value-1))};window.addEventListener("keydown",keyboard);return()=>{window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true);window.removeEventListener("keydown",keyboard)}},[open,index,steps]);
  if(!open)return null;
  const cardTop=rect?(rect.bottom+16+260<window.innerHeight?rect.bottom+16:Math.max(16,rect.top-240)):"50%",cardLeft=rect?Math.min(Math.max(16,rect.left),window.innerWidth-376):"50%";
  return <div className="tour-layer" role="dialog" aria-modal="true" aria-label="Tour guiado"><div className="tour-shade"/><div className="tour-focus" style={rect?{top:rect.top-7,left:rect.left-7,width:rect.width+14,height:rect.height+14}:{display:"none"}}/><section className="tour-card" style={{top:cardTop,left:cardLeft,transform:rect?undefined:"translate(-50%,-50%)"}}><button className="tour-close" onClick={finish} aria-label="Cerrar tour"><X/></button><small>PASO {index+1} DE {steps.length}</small><h2>{steps[index].title}</h2><p>{steps[index].body}</p><div className="tour-progress">{steps.map((_,position)=><i className={position<=index?"active":""} key={position}/>)}</div><footer><button onClick={finish}>Omitir tour</button><span>{index>0&&<button onClick={()=>setIndex(value=>value-1)}><ChevronLeft/>Atrás</button>}<button className="tour-next" onClick={next}>{index===steps.length-1?"Finalizar":"Siguiente"}{index<steps.length-1&&<ChevronRight/>}</button></span></footer></section></div>;
}
