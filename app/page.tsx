"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, BookOpen, CalendarDays, ChevronRight, CircleHelp, Clock3, FileText,
  GraduationCap, Home, Library, MessageSquare, MoreHorizontal, Plus, Search,
  Settings, Sparkles, TrendingUp, Users, Video, X, LogOut
} from "lucide-react";

type Role = "Docente" | "Alumno" | "Administrador";
type CourseCard = { id?: string; title: string; code: string; students: number; progress: number; color: string; icon: string; next: string; time: string };

const courses: CourseCard[] = [
  { title: "Diseño de Interfaces", code: "DIS-204", students: 28, progress: 72, color: "violet", icon: "✦", next: "Crítica de prototipos", time: "Hoy, 15:30" },
  { title: "Fundamentos de UX", code: "UX-101", students: 34, progress: 48, color: "orange", icon: "◎", next: "Mapa de empatía", time: "Mañana, 10:00" },
  { title: "Prototipado Digital", code: "PRO-310", students: 21, progress: 86, color: "blue", icon: "⌁", next: "Entrega proyecto final", time: "Viernes, 23:59" },
];

const nav = [
  { label: "Inicio", icon: Home }, { label: "Mis aulas", icon: BookOpen },
  { label: "Calendario", icon: CalendarDays }, { label: "Mensajes", icon: MessageSquare, badge: 4 },
];

export default function HomePage() {
  const [role, setRole] = useState<Role>("Docente");
  const [displayName, setDisplayName] = useState("Usuario");
  const [courseData, setCourseData] = useState<CourseCard[]>(courses);
  const [active, setActive] = useState("Inicio");
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => courseData.filter(c => c.title.toLowerCase().includes(query.toLowerCase())), [query, courseData]);

  useEffect(() => {
    fetch("/api/auth/me").then(response => response.json()).then(({ user }) => {
      if (!user) return;
      setDisplayName(user.name);
      setRole(user.role === "ADMIN" ? "Administrador" : user.role === "TEACHER" ? "Docente" : "Alumno");
    });
  }, []);

  useEffect(() => {
    fetch("/api/classrooms").then(response => response.json()).then(({ classrooms }) => {
      if (!classrooms?.length) return;
      const palette = ["violet", "orange", "blue"];
      setCourseData(classrooms.slice(0, 6).map((classroom: { id:string; title:string; inviteCode:string; status:string; _count:{enrollments:number;modules:number} }, index:number) => ({ id:classroom.id, title:classroom.title, code:classroom.inviteCode, students:classroom._count.enrollments, progress:classroom.status === "ACTIVE" ? 65 : 15, color:palette[index%palette.length], icon:index%3===0?"✦":index%3===1?"◎":"⌁", next:`${classroom._count.modules} módulos disponibles`, time:classroom.status === "ACTIVE" ? "Aula publicada" : "En preparación" })));
    });
  }, []);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".course-card"));
    cards.forEach((card, index) => { card.onclick = (event) => { if ((event.target as HTMLElement).closest("button")) return; const id = filtered[index]?.id; if (id) window.location.href = `/aulas/${id}`; }; });
    return () => cards.forEach(card => { card.onclick = null; });
  }, [filtered]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><GraduationCap size={23}/></span><span>Aula<span>Nova</span></span></div>
        <div className="profile">
          <div className="avatar">{displayName.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase()}<span /></div>
          <div><strong>{displayName}</strong><small>{role}</small></div>
          <button aria-label="Más opciones"><MoreHorizontal size={18}/></button>
        </div>
        <div className="role-switch role-label">Vista de {role.toLowerCase()}</div>
        <nav>
          <p>ESPACIO DE TRABAJO</p>
          {nav.map(({label, icon: Icon, badge}) => <button key={label} className={active === label ? "active" : ""} onClick={() => label === "Mis aulas" ? (window.location.href = "/aulas") : setActive(label)}><Icon size={19}/><span>{label}</span>{badge && <b>{badge}</b>}</button>)}
          <p>GESTIÓN</p>
          <button><Library size={19}/><span>Recursos</span></button>
          <button onClick={() => role === "Administrador" && (window.location.href = "/admin/usuarios")}><Users size={19}/><span>{role === "Administrador" ? "Usuarios" : "Estudiantes"}</span></button>
          <button><TrendingUp size={19}/><span>Calificaciones</span></button>
        </nav>
        <div className="sidebar-bottom">
          <button><CircleHelp size={19}/>Ayuda y soporte</button>
          <button><Settings size={19}/>Configuración</button>
          <button onClick={logout}><LogOut size={19}/>Cerrar sesión</button>
        </div>
      </aside>

      <section className="content">
        <header>
          <label className="search"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar aulas, recursos o estudiantes…"/><kbd>⌘ K</kbd></label>
          <div className="header-actions"><button className="icon-btn" aria-label="Notificaciones"><Bell size={20}/><i /></button><button className="primary" onClick={() => role === "Administrador" ? (window.location.href = "/admin/usuarios") : (window.location.href = role === "Docente" ? "/aulas?action=create" : "/aulas")}><Plus size={18}/>{role === "Docente" ? "Crear aula" : role === "Administrador" ? "Nuevo usuario" : "Unirme a un aula"}</button></div>
        </header>

        <div className="body">
          <section className="welcome">
            <div><span className="eyebrow"><Sparkles size={14}/> MIÉRCOLES, 29 DE JULIO</span><h1>Buenos días, {displayName.split(" ")[0]} <span>👋</span></h1><p>{role === "Docente" ? "Tienes 3 aulas activas y 8 entregas esperando tu revisión." : role === "Alumno" ? "Tienes dos actividades por completar esta semana." : "La comunidad cuenta con 186 usuarios activos."}</p></div>
            <div className="week"><b>Semana 7</b><small>del periodo actual</small><span><i style={{width:"68%"}} /></span><em>68% completado</em></div>
          </section>

          <section className="stats">
            <article><span className="stat-icon purple"><BookOpen size={21}/></span><div><small>AULAS ACTIVAS</small><strong>{role === "Administrador" ? 18 : 3}</strong><em>+1 este mes</em></div></article>
            <article><span className="stat-icon peach"><Users size={21}/></span><div><small>ESTUDIANTES</small><strong>{role === "Administrador" ? 168 : 83}</strong><em>+6 esta semana</em></div></article>
            <article><span className="stat-icon green"><FileText size={21}/></span><div><small>POR REVISAR</small><strong>8</strong><em>3 vencen hoy</em></div></article>
            <article><span className="stat-icon yellow"><TrendingUp size={21}/></span><div><small>PROMEDIO GENERAL</small><strong>86%</strong><em>↑ 4% este periodo</em></div></article>
          </section>

          <div className="grid">
            <section>
              <div className="section-title"><div><h2>{role === "Alumno" ? "Mis cursos" : "Mis aulas"}</h2><p>Continúa donde lo dejaste</p></div><button>Ver todas <ChevronRight size={16}/></button></div>
              <div className="course-grid">
                {filtered.map(course => <article className="course-card" key={course.code}>
                  <div className={`course-cover ${course.color}`}><span>{course.icon}</span><button><MoreHorizontal size={19}/></button><label>{course.code}</label></div>
                  <div className="course-info"><h3>{course.title}</h3><p><Users size={15}/>{course.students} estudiantes</p><div className="progress-label"><span>Progreso del curso</span><b>{course.progress}%</b></div><div className="bar"><i style={{width:`${course.progress}%`}} /></div><div className="next"><Clock3 size={16}/><div><small>PRÓXIMO</small><strong>{course.next}</strong><span>{course.time}</span></div></div></div>
                </article>)}
              </div>
            </section>

            <aside className="activity-panel">
              <div className="section-title"><div><h2>Próximamente</h2><p>Tu agenda</p></div><button><CalendarDays size={18}/></button></div>
              <div className="date-row"><div><b>29</b><small>JUL</small></div><span><strong>Revisión de entregas</strong><small>Diseño de Interfaces · 14:00</small></span><i className="dot violet"/></div>
              <div className="date-row"><div><b>30</b><small>JUL</small></div><span><strong>Clase en vivo</strong><small>Fundamentos de UX · 10:00</small></span><i className="dot orange"/></div>
              <div className="date-row"><div><b>01</b><small>AGO</small></div><span><strong>Proyecto final</strong><small>Prototipado · 23:59</small></span><i className="dot blue"/></div>
              <button className="agenda">Abrir calendario completo</button>
              <div className="live-card"><span><Video size={19}/></span><div><small>EN 45 MINUTOS</small><strong>Crítica de prototipos</strong><p>Diseño de Interfaces</p></div><button>Entrar</button></div>
            </aside>
          </div>
        </div>
      </section>

      {showCreate && <div className="modal-backdrop" onMouseDown={() => setShowCreate(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setShowCreate(false)}><X/></button><span className="modal-icon"><BookOpen/></span><h2>{role === "Docente" ? "Crea una nueva aula" : role === "Administrador" ? "Registrar usuario" : "Únete a un aula"}</h2><p>{role === "Docente" ? "Prepara un nuevo espacio de aprendizaje para tus estudiantes." : "Completa los datos para continuar."}</p><label>Nombre<input autoFocus placeholder={role === "Docente" ? "Ej. Diseño editorial" : "Escribe aquí…"}/></label><label>{role === "Alumno" ? "Código de invitación" : "Descripción"}<textarea placeholder="Añade información breve…"/></label><div className="modal-actions"><button onClick={() => setShowCreate(false)}>Cancelar</button><button className="primary" onClick={() => setShowCreate(false)}>Continuar</button></div></div></div>}
    </main>
  );
}
