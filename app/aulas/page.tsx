"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Copy,
  GraduationCap,
  KeyRound,
  Layers3,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import "./classrooms.css";
import "./enrollment.css";
import { useAppDialogs } from "@/app/components/AppDialogs";

type Role = "ADMIN" | "TEACHER" | "STUDENT";
type Classroom = {
  id: string;
  title: string;
  description: string | null;
  color: string;
  inviteCode: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  enrollmentStatus: "PENDING" | "ACTIVE" | "SUSPENDED" | null;
  createdAt: string;
  updatedAt: string;
  teacher: { id: string; name: string; email: string };
  _count: { enrollments: number; modules: number };
};
const statusLabel = {
  DRAFT: "Borrador",
  ACTIVE: "Publicada",
  ARCHIVED: "Archivada",
};

export default function ClassroomsPage() {
  const { notify } = useAppDialogs();
  const [role, setRole] = useState<Role>("STUDENT");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [modal, setModal] = useState<"create" | "join" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  async function load() {
    const [meResponse, classroomResponse] = await Promise.all([
      fetch("/api/auth/me"),
      fetch("/api/classrooms", { cache: "no-store" }),
    ]);
    const me = await meResponse.json();
    const data = await classroomResponse.json();
    if (me.user) setRole(me.user.role);
    setClassrooms(data.classrooms ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("action") === "create")
      setModal("create");
  }, []);
  const visible = useMemo(
    () =>
      classrooms.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) &&
          (filter === "ALL" || c.status === filter),
      ),
    [classrooms, query, filter],
  );
  useEffect(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>(".real-classroom-card"),
    );
    cards.forEach((card, index) => {
      const course = visible[index],
        allowed = role !== "STUDENT" || course?.enrollmentStatus === "ACTIVE";
      card.style.cursor = allowed ? "pointer" : "default";
      card.onclick = (event) => {
        const target = event.target as HTMLElement;
        if (!allowed || target.closest("button,select,a")) return;
        window.location.href = `/aulas/${course?.id}`;
      };
    });
    return () =>
      cards.forEach((card) => {
        card.onclick = null;
      });
  }, [visible, role]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const d = new FormData(event.currentTarget);
    const response = await fetch("/api/classrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: d.get("title"),
        description: d.get("description"),
        color: d.get("color"),
        status: d.get("status"),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setClassrooms((c) => [result.classroom, ...c]);
    setSaving(false);
    setModal(null);
  }
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const d = new FormData(event.currentTarget);
    const response = await fetch("/api/classrooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: d.get("code") }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    await load();
    setSaving(false);
    setModal(null);
  }
  async function requestEnrollment(id: string) {
    setSaving(true);
    const response = await fetch("/api/classrooms/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroomId: id }),
      }),
      result = await response.json();
    if (!response.ok) notify(result.error, "No se pudo solicitar la matrícula");
    await load();
    setSaving(false);
  }
  async function changeStatus(id: string, status: Classroom["status"]) {
    const response = await fetch(`/api/classrooms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (response.ok)
      setClassrooms((current) =>
        current.map((c) => (c.id === id ? result.classroom : c)),
      );
    else notify(result.error, "No se pudo cambiar el estado");
  }
  async function copy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(""), 1600);
  }
  useEffect(() => {
    if (role !== "STUDENT") return;
    document.querySelectorAll(".enrollment-action").forEach((e) => e.remove());
    document
      .querySelectorAll<HTMLElement>(
        ".real-classroom-card .classroom-card-body",
      )
      .forEach((body, index) => {
        const course = visible[index];
        if (!course) return;
        const button = document.createElement("button");
        button.className = `enrollment-action ${course.enrollmentStatus?.toLowerCase() || "available"}`;
        button.textContent =
          course.enrollmentStatus === "ACTIVE"
            ? "Entrar al curso"
            : course.enrollmentStatus === "PENDING"
              ? "Solicitud pendiente"
              : course.enrollmentStatus === "SUSPENDED"
                ? "Solicitar nuevamente"
                : "Solicitar matrícula";
        button.disabled = saving || course.enrollmentStatus === "PENDING";
        button.onclick = () =>
          course.enrollmentStatus === "ACTIVE"
            ? window.location.assign(`/aulas/${course.id}`)
            : void requestEnrollment(course.id);
        body.insertBefore(button, body.querySelector(".card-bottom"));
      });
    return () =>
      document
        .querySelectorAll(".enrollment-action")
        .forEach((e) => e.remove());
  }, [role, visible, saving]);
  const canCreate = role === "ADMIN" || role === "TEACHER";
  return (
    <main className="classrooms-page">
      <header className="classrooms-header">
        <Link className="class-brand" href="/">
          <span>
            <GraduationCap size={21} />
          </span>
          Aula<b>Nova</b>
        </Link>
        <Link href="/" className="back-home">
          <ArrowLeft size={17} />
          Volver al panel
        </Link>
      </header>
      <div className="classrooms-body">
        <section className="classrooms-title">
          <div>
            <small>ESPACIOS DE APRENDIZAJE</small>
            <h1>{role === "STUDENT" ? "Mis cursos" : "Mis aulas"}</h1>
            <p>
              {role === "STUDENT"
                ? "Continúa aprendiendo en las aulas donde estás matriculado."
                : "Crea y organiza experiencias de aprendizaje para tus estudiantes."}
            </p>
          </div>
          <div>
            {role === "STUDENT" && (
              <button
                className="secondary-action"
                onClick={() => setModal("join")}
              >
                <KeyRound size={17} />
                Unirme con código
              </button>
            )}
            {canCreate && (
              <button
                className="main-action"
                onClick={() => setModal("create")}
              >
                <Plus size={18} />
                Crear aula
              </button>
            )}
          </div>
        </section>
        <section className="classroom-toolbar">
          <label>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar aulas…"
            />
          </label>
          <div>
            {[
              ["ALL", "Todas"],
              ["ACTIVE", "Publicadas"],
              ["DRAFT", "Borradores"],
              ["ARCHIVED", "Archivadas"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </section>
        {loading ? (
          <div className="classroom-state">
            <LoaderCircle className="spin" />
            Cargando aulas…
          </div>
        ) : (
          <section className="real-classroom-grid">
            {visible.map((c) => (
              <article className="real-classroom-card" key={c.id}>
                <div
                  className="classroom-cover"
                  style={{
                    background: `linear-gradient(135deg,${c.color},${c.color}b5)`,
                  }}
                >
                  <span className={`class-status ${c.status.toLowerCase()}`}>
                    {statusLabel[c.status]}
                  </span>
                  {canCreate && (
                    <button>
                      <MoreHorizontal />
                    </button>
                  )}
                  <BookOpen size={35} />
                </div>
                <div className="classroom-card-body">
                  <small className="teacher">
                    {role === "ADMIN"
                      ? `DOCENTE · ${c.teacher.name}`
                      : "AULA VIRTUAL"}
                  </small>
                  <h2>{c.title}</h2>
                  <p>{c.description || "Sin descripción todavía."}</p>
                  <div className="classroom-numbers">
                    <span>
                      <Users size={15} />
                      <b>{c._count.enrollments}</b> alumnos
                    </span>
                    <span>
                      <Layers3 size={15} />
                      <b>{c._count.modules}</b> módulos
                    </span>
                  </div>
                  {canCreate && (
                    <div className="invite">
                      <span>
                        <KeyRound size={15} />
                        <small>CÓDIGO</small>
                        <b>{c.inviteCode}</b>
                      </span>
                      <button onClick={() => copy(c.inviteCode)}>
                        {copied === c.inviteCode ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  )}
                  <div className="card-bottom">
                    <span>
                      <Clock3 size={14} />
                      Actualizada{" "}
                      {new Date(c.updatedAt).toLocaleDateString("es")}
                    </span>
                    {canCreate && (
                      <select
                        value={c.status}
                        onChange={(e) =>
                          changeStatus(
                            c.id,
                            e.target.value as Classroom["status"],
                          )
                        }
                      >
                        <option value="DRAFT">Borrador</option>
                        <option value="ACTIVE">Publicar</option>
                        <option value="ARCHIVED">Archivar</option>
                      </select>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!visible.length && (
              <div className="empty-classrooms">
                <Archive size={38} />
                <h2>Aún no hay aulas aquí</h2>
                <p>
                  {canCreate
                    ? "Crea tu primera aula para comenzar."
                    : "Usa un código de invitación para matricularte."}
                </p>
                <button onClick={() => setModal(canCreate ? "create" : "join")}>
                  {canCreate ? "Crear primera aula" : "Ingresar código"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
      {modal && (
        <div className="class-modal-bg" onMouseDown={() => setModal(null)}>
          <form
            className="class-modal"
            onSubmit={modal === "create" ? create : join}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="class-modal-x"
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            <span className="class-modal-icon">
              {modal === "create" ? <BookOpen /> : <KeyRound />}
            </span>
            <h2>
              {modal === "create" ? "Crear una nueva aula" : "Unirme a un aula"}
            </h2>
            <p>
              {modal === "create"
                ? "Configura el espacio inicial para tu próximo curso."
                : "Introduce el código que recibiste de tu docente."}
            </p>
            {modal === "create" ? (
              <>
                <label>
                  Nombre del aula
                  <input
                    name="title"
                    placeholder="Ej. Matemática básica"
                    minLength={3}
                    required
                  />
                </label>
                <label>
                  Descripción
                  <textarea
                    name="description"
                    placeholder="¿Qué aprenderán tus estudiantes?"
                    maxLength={500}
                  />
                </label>
                <div className="class-form-split">
                  <label>
                    Color
                    <input name="color" type="color" defaultValue="#6d5dfc" />
                  </label>
                  <label>
                    Estado
                    <select name="status" defaultValue="DRAFT">
                      <option value="DRAFT">Guardar como borrador</option>
                      <option value="ACTIVE">Publicar ahora</option>
                    </select>
                  </label>
                </div>
              </>
            ) : (
              <label>
                Código de invitación
                <input
                  name="code"
                  className="code-input"
                  placeholder="AB12CD34"
                  minLength={4}
                  required
                  autoFocus
                />
              </label>
            )}
            {error && <p className="class-error">{error}</p>}
            <div className="class-modal-actions">
              <button type="button" onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button disabled={saving}>
                {saving ? (
                  <LoaderCircle className="spin" />
                ) : modal === "create" ? (
                  "Crear aula"
                ) : (
                  "Unirme"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
