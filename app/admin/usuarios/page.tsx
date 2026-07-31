"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import "./users.css";
import { useAppDialogs } from "@/app/components/AppDialogs";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  active: boolean;
  createdAt: string;
  _count: { classrooms: number; enrollments: number };
};
const labels = {
  ADMIN: "Administrador",
  TEACHER: "Docente",
  STUDENT: "Alumno",
};

export default function UsersPage() {
  const { notify } = useAppDialogs();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  async function loadUsers() {
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.status === 403) {
      setDenied(true);
      setLoading(false);
      return;
    }
    const data = await response.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }
  useEffect(() => {
    loadUsers();
  }, []);

  const visible = useMemo(
    () =>
      users.filter((user) => {
        const matches = `${user.name} ${user.email}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matches && (filter === "ALL" || user.role === filter);
      }),
    [users, query, filter],
  );

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        password: data.get("password"),
        role: data.get("role"),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    setUsers((current) => [result.user, ...current]);
    setSaving(false);
    setShowCreate(false);
  }

  async function updateUser(
    id: string,
    update: Partial<Pick<User, "role" | "active">>,
  ) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const result = await response.json();
    if (!response.ok) {
      notify(result.error, "No se pudo actualizar");
      return;
    }
    setUsers((current) =>
      current.map((user) => (user.id === id ? result.user : user)),
    );
  }

  if (denied)
    return (
      <main className="access-denied">
        <ShieldCheck size={44} />
        <h1>Acceso restringido</h1>
        <p>Esta sección está disponible únicamente para administradores.</p>
        <Link href="/">Volver al inicio</Link>
      </main>
    );

  const teachers = users.filter((u) => u.role === "TEACHER").length;
  const students = users.filter((u) => u.role === "STUDENT").length;
  return (
    <main className="users-page">
      <header className="users-header">
        <Link className="mini-brand" href="/">
          <span>
            <GraduationCap size={21} />
          </span>
          Aula<b>Nova</b>
        </Link>
        <Link className="back" href="/">
          <ArrowLeft size={17} />
          Volver al panel
        </Link>
      </header>
      <div className="users-body">
        <section className="users-title">
          <div>
            <small>ADMINISTRACIÓN</small>
            <h1>Gestión de usuarios</h1>
            <p>Administra el acceso y los roles de tu comunidad educativa.</p>
          </div>
          <button onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            Nuevo usuario
          </button>
        </section>
        <section className="users-stats">
          <article>
            <span className="purple">
              <Users />
            </span>
            <div>
              <small>USUARIOS TOTALES</small>
              <strong>{users.length}</strong>
              <em>{users.filter((u) => u.active).length} activos</em>
            </div>
          </article>
          <article>
            <span className="orange">
              <BookOpen />
            </span>
            <div>
              <small>DOCENTES</small>
              <strong>{teachers}</strong>
              <em>Con acceso docente</em>
            </div>
          </article>
          <article>
            <span className="blue">
              <GraduationCap />
            </span>
            <div>
              <small>ALUMNOS</small>
              <strong>{students}</strong>
              <em>Registrados</em>
            </div>
          </article>
        </section>
        <section className="users-card">
          <div className="users-toolbar">
            <label>
              <Search size={18} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o correo…"
              />
            </label>
            <div className="filters">
              {[
                ["ALL", "Todos"],
                ["TEACHER", "Docentes"],
                ["STUDENT", "Alumnos"],
                ["ADMIN", "Administradores"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "active" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="table-state">
              <LoaderCircle className="spin" />
              Cargando usuarios…
            </div>
          ) : (
            <div className="users-table">
              <div className="table-row table-head">
                <span>USUARIO</span>
                <span>ROL</span>
                <span>ESTADO</span>
                <span>ACTIVIDAD</span>
                <span>REGISTRO</span>
                <span />
              </div>
              {visible.map((user) => (
                <div className="table-row" key={user.id}>
                  <div className="user-cell">
                    <span className={`user-avatar ${user.role.toLowerCase()}`}>
                      {user.name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>
                        <Mail size={11} />
                        {user.email}
                      </small>
                    </div>
                  </div>
                  <div>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUser(user.id, {
                          role: e.target.value as User["role"],
                        })
                      }
                    >
                      <option value="STUDENT">Alumno</option>
                      <option value="TEACHER">Docente</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <span className={`status ${user.active ? "on" : "off"}`}>
                    {user.active ? <CheckCircle2 /> : <XCircle />}
                    {user.active ? "Activo" : "Suspendido"}
                  </span>
                  <span className="activity">
                    {user.role === "TEACHER"
                      ? `${user._count.classrooms} aulas`
                      : user.role === "STUDENT"
                        ? `${user._count.enrollments} matrículas`
                        : "Acceso total"}
                  </span>
                  <span className="date">
                    {new Date(user.createdAt).toLocaleDateString("es", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <div className="row-actions">
                    <button
                      title={user.active ? "Suspender" : "Activar"}
                      onClick={() =>
                        updateUser(user.id, { active: !user.active })
                      }
                    >
                      {user.active ? (
                        <XCircle size={18} />
                      ) : (
                        <CheckCircle2 size={18} />
                      )}
                    </button>
                    <button>
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {!visible.length && (
                <div className="table-state">No se encontraron usuarios.</div>
              )}
            </div>
          )}
        </section>
      </div>
      {showCreate && (
        <div className="user-modal-bg" onMouseDown={() => setShowCreate(false)}>
          <form
            className="user-modal"
            onSubmit={createUser}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-x"
              onClick={() => setShowCreate(false)}
            >
              <X />
            </button>
            <span className="modal-user-icon">
              <UserRound />
            </span>
            <h2>Registrar nuevo usuario</h2>
            <p>Crea el acceso inicial para un docente o alumno.</p>
            <label>
              Nombre completo
              <input
                name="name"
                placeholder="Nombre y apellido"
                minLength={3}
                required
              />
            </label>
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                placeholder="usuario@correo.com"
                required
              />
            </label>
            <div className="form-split">
              <label>
                Rol
                <select name="role" defaultValue="TEACHER">
                  <option value="TEACHER">Docente</option>
                  <option value="STUDENT">Alumno</option>
                </select>
              </label>
              <label>
                Contraseña temporal
                <input
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
              </label>
            </div>
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-buttons">
              <button type="button" onClick={() => setShowCreate(false)}>
                Cancelar
              </button>
              <button disabled={saving}>
                {saving ? <LoaderCircle className="spin" /> : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
