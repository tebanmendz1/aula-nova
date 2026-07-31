"use client";
import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  GraduationCap,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  Save,
  Settings,
} from "lucide-react";
import "./settings.css";
import { useAppDialogs } from "@/app/components/AppDialogs";
type Classroom = {
  id: string;
  title: string;
  description: string | null;
  color: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  inviteCode: string;
  invitationMode: "SINGLE_USE" | "REUSABLE" | "CLOSED";
  _count: { enrollments: number; modules: number };
};
export default function CourseSettings({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { confirm: confirmDialog } = useAppDialogs();
  const { id } = use(params),
    [data, setData] = useState<Classroom | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [copied, setCopied] = useState(false);
  async function load() {
    const r = await fetch(`/api/classrooms/${id}/settings`, {
        cache: "no-store",
      }),
      d = await r.json();
    if (r.ok) setData(d.classroom);
    else setMessage(d.error);
  }
  useEffect(() => {
    load();
  }, [id]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget),
      r = await fetch(`/api/classrooms/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      }),
      d = await r.json();
    setMessage(r.ok ? "Configuración guardada." : d.error);
    if (r.ok) await load();
    setBusy(false);
  }
  async function regenerate() {
    if (!await confirmDialog("El código actual dejará de funcionar. ¿Generar uno nuevo?", "Renovar código de invitación"))
      return;
    setBusy(true);
    const r = await fetch(`/api/classrooms/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateCode: true }),
      }),
      d = await r.json();
    if (r.ok)
      setData((current) =>
        current ? { ...current, inviteCode: d.classroom.inviteCode } : current,
      );
    setBusy(false);
  }
  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  if (!data)
    return (
      <main className="settings-state">
        <LoaderCircle className="spin" />
        {message || "Cargando configuración…"}
      </main>
    );
  return (
    <main className="course-settings">
      <header>
        <Link href={`/aulas/${id}`}>
          <ArrowLeft />
          Volver al aula
        </Link>
        <span>
          <GraduationCap />
          Aula<b>Nova</b>
        </span>
      </header>
      <div className="settings-shell">
        <section className="settings-heading">
          <span>
            <Settings />
          </span>
          <div>
            <small>ADMINISTRACIÓN DEL CURSO</small>
            <h1>Configuración</h1>
            <p>Controla la información, publicación y acceso de estudiantes.</p>
          </div>
        </section>
        <div className="settings-grid">
          <form onSubmit={save}>
            <h2>Información general</h2>
            <label>
              Nombre del curso
              <input
                name="title"
                defaultValue={data.title}
                required
                minLength={3}
              />
            </label>
            <label>
              Descripción
              <textarea
                name="description"
                defaultValue={data.description || ""}
              />
            </label>
            <div className="settings-row">
              <label>
                Color
                <input name="color" type="color" defaultValue={data.color} />
              </label>
              <label>
                Estado
                <select name="status" defaultValue={data.status}>
                  <option value="DRAFT">Borrador</option>
                  <option value="ACTIVE">Publicado</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </label>
            </div>
            <label>
              Modo de invitación
              <select name="invitationMode" defaultValue={data.invitationMode}>
                <option value="SINGLE_USE">
                  Código de un solo uso (recomendado)
                </option>
                <option value="REUSABLE">Código reutilizable</option>
                <option value="CLOSED">Matrícula cerrada</option>
              </select>
              <small>
                En modo de un solo uso, el código cambia automáticamente después
                de cada nueva matrícula.
              </small>
            </label>
            {message && <p className="settings-message">{message}</p>}
            <button className="settings-save" disabled={busy}>
              <Save />
              {busy ? "Guardando…" : "Guardar configuración"}
            </button>
          </form>
          <aside>
            <span>
              <KeyRound />
            </span>
            <small>CÓDIGO ACTUAL</small>
            <strong>{data.inviteCode}</strong>
            <p>
              {data.invitationMode === "SINGLE_USE"
                ? "Válido para una sola matrícula."
                : data.invitationMode === "REUSABLE"
                  ? "Puede ser utilizado por varios alumnos."
                  : "La matrícula está cerrada."}
            </p>
            <div>
              <button onClick={copy}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button onClick={regenerate} disabled={busy}>
                <RefreshCw />
                Renovar
              </button>
            </div>
            <hr />
            <p>
              <b>{data._count.enrollments}</b> alumnos matriculados
              <br />
              <b>{data._count.modules}</b> unidades creadas
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
