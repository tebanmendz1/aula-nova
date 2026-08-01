"use client";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  GraduationCap,
  LoaderCircle,
  Search,
  Send,
  Users,
} from "lucide-react";
import "./tasks.css";
type Submission = {
  id: string;
  score: number | null;
  status: "DRAFT" | "SUBMITTED" | "REOPENED";
  submittedAt: string;
  student: { id: string; name: string; email: string };
};
type Activity = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueAt: string | null;
  maxScore: number;
  submissions: Submission[];
};
type Classroom = {
  title: string;
  enrollments: { student: { id: string; name: string; email: string } }[];
  modules: {
    title: string;
    lessons: { title: string; activities: Activity[] }[];
  }[];
};
type LocatedActivity = Activity & { module: string; lesson: string };
function grouped(activities: LocatedActivity[]) {
  return Object.entries(
    activities.reduce<Record<string, Record<string, LocatedActivity[]>>>(
      (units, activity) => {
        units[activity.module] ??= {};
        units[activity.module][activity.lesson] ??= [];
        units[activity.module][activity.lesson].push(activity);
        return units;
      },
      {},
    ),
  );
}
export default function TasksCenter({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params),
    [classroom, setClassroom] = useState<Classroom | null>(null),
    [role, setRole] = useState("STUDENT"),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("ALL");
  useEffect(() => {
    fetch(`/api/classrooms/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setClassroom(data.classroom);
        setRole(data.role);
        setLoading(false);
      });
  }, [id]);
  const activities = useMemo(
    () =>
      classroom?.modules.flatMap((module) =>
        module.lessons.flatMap((lesson) =>
          lesson.activities.map((activity) => ({
            ...activity,
            module: module.title,
            lesson: lesson.title,
          })),
        ),
      ) ?? [],
    [classroom],
  );
  if (loading)
    return (
      <main className="tasks-state">
        <LoaderCircle className="spin" />
        Cargando tareas…
      </main>
    );
  if (!classroom) return <main className="tasks-state">No tienes acceso.</main>;
  const submitted = activities.reduce(
      (sum, a) =>
        sum + a.submissions.filter((s) => s.status === "SUBMITTED").length,
      0,
    ),
    graded = activities.reduce(
      (sum, a) => sum + a.submissions.filter((s) => s.score != null).length,
      0,
    );
  return (
    <main className="tasks-page">
      <header className="tasks-header">
        <Link href={`/aulas/${id}`}>
          <ArrowLeft />
          Volver al aula
        </Link>
        <span>
          <GraduationCap />
          Aula<b>Nova</b>
        </span>
      </header>
      <div className="tasks-wrap">
        <section className="tasks-heading">
          <div>
            <small>RESUMEN DE ACTIVIDADES</small>
            <h1>Tareas de {classroom.title}</h1>
            <p>
              {role === "STUDENT"
                ? "Revisa el estado de tus entregas y abre cada tarea para trabajar."
                : "Consulta entregas, borradores y pendientes de calificación."}
            </p>
          </div>
          <div className="tasks-summary">
            <article>
              <Users />
              <b>
                {role === "STUDENT"
                  ? activities.length
                  : classroom.enrollments.length}
              </b>
              <span>
                {role === "STUDENT" ? "Actividades" : "Participantes"}
              </span>
            </article>
            <article>
              <Send />
              <b>{submitted}</b>
              <span>Enviadas</span>
            </article>
            <article>
              <CheckCircle2 />
              <b>{graded}</b>
              <span>Calificadas</span>
            </article>
          </div>
        </section>
        {role === "STUDENT" ? (
          <StudentOverview id={id} activities={activities} />
        ) : (
          <TeacherOverview
            id={id}
            activities={activities}
            students={classroom.enrollments}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
          />
        )}
      </div>
    </main>
  );
}
function label(submission?: Submission, due?: string | null) {
  if (!submission)
    return due && new Date(due) < new Date() ? "Atrasada" : "Sin entrega";
  if (submission.status === "DRAFT") return "Borrador";
  if (submission.status === "REOPENED") return "Reabierta";
  return submission.score != null ? "Calificada" : "Por calificar";
}
function StudentOverview({
  id,
  activities,
}: {
  id: string;
  activities: LocatedActivity[];
}) {
  return (
    <section className="activity-curriculum">
      {grouped(activities).map(([unit, themes]) => (
        <details className="activity-unit student-unit" key={unit}>
          <summary>
            <span>
              <small>UNIDAD</small>
              <b>{unit}</b>
            </span>
            <i>
              {Object.values(themes).reduce(
                (total, themeActivities) => total + themeActivities.length,
                0,
              )}{" "}
              actividades
            </i>
          </summary>
          <div className="unit-themes">
            {Object.entries(themes).map(([theme, themeActivities]) => (
              <details className="activity-theme" key={theme} open>
                <summary>
                  <span>TEMA</span>
                  <b>{theme}</b>
                  <i>{themeActivities.length} actividades</i>
                </summary>
                <div className="student-task-grid">
                  {themeActivities.map((activity) => {
                    const submission = activity.submissions[0],
                      state = label(submission, activity.dueAt);
                    return (
                      <article className="student-task-card" key={activity.id}>
                        <div className="task-card-top">
                          <i
                            className={`status ${state.toLowerCase().replaceAll(" ", "-")}`}
                          >
                            {state}
                          </i>
                          <small>{activity.lesson}</small>
                        </div>
                        <h2>{activity.title}</h2>
                        <p>
                          {activity.description ||
                            "Sin instrucciones adicionales."}
                        </p>
                        <dl>
                          <div>
                            <dt>Fecha límite</dt>
                            <dd>
                              {activity.dueAt
                                ? new Date(activity.dueAt).toLocaleString("es")
                                : "Sin fecha"}
                            </dd>
                          </div>
                          <div>
                            <dt>Última entrega</dt>
                            <dd>
                              {submission
                                ? new Date(
                                    submission.submittedAt,
                                  ).toLocaleString("es")
                                : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt>Calificación</dt>
                            <dd>
                              {submission?.score != null
                                ? `${submission.score}/${activity.maxScore}`
                                : `—/${activity.maxScore}`}
                            </dd>
                          </div>
                        </dl>
                        <Link href={`/aulas/${id}/tareas/${activity.id}`}>
                          {submission?.status === "DRAFT" ||
                          submission?.status === "REOPENED"
                            ? "Continuar entrega"
                            : "Abrir tarea"}
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
function TeacherOverview({
  id,
  activities,
  students,
  query,
  setQuery,
  filter,
  setFilter,
}: {
  id: string;
  activities: LocatedActivity[];
  students: Classroom["enrollments"];
  query: string;
  setQuery: (v: string) => void;
  filter: string;
  setFilter: (v: string) => void;
}) {
  return (
    <section className="teacher-activities">
      <div className="table-tools">
        <label>
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar estudiante…"
          />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">Todos</option>
          <option value="Sin entrega">Sin entrega</option>
          <option value="Borrador">Borrador</option>
          <option value="Por calificar">Por calificar</option>
          <option value="Calificada">Calificada</option>
        </select>
      </div>
      {grouped(activities).map(([unit, themes]) => (
        <section className="activity-unit" key={unit}>
          <header>
            <small>UNIDAD</small>
            <h2>{unit}</h2>
          </header>
          {Object.entries(themes).map(([theme, themeActivities]) => (
            <details className="activity-theme teacher-theme" key={theme} open>
              <summary>
                <span>TEMA</span>
                <b>{theme}</b>
                <i>{themeActivities.length} actividades</i>
              </summary>
              <div className="theme-activities">
                {themeActivities.map((activity) => {
                  const sent = activity.submissions.filter(
                      (s) => s.status === "SUBMITTED",
                    ).length,
                    pending = activity.submissions.filter(
                      (s) => s.status === "SUBMITTED" && s.score == null,
                    ).length;
                  return (
                    <details key={activity.id} open>
                      <summary>
                        <div>
                          <small>
                            {activity.lesson} · {activity.type}
                          </small>
                          <h2>{activity.title}</h2>
                          <span>
                            {activity.dueAt
                              ? `Vence ${new Date(activity.dueAt).toLocaleString("es")}`
                              : "Sin fecha límite"}
                          </span>
                        </div>
                        <div className="activity-counts">
                          <b>
                            {sent}/{students.length}
                            <small>Enviadas</small>
                          </b>
                          <b>
                            {pending}
                            <small>Por calificar</small>
                          </b>
                        </div>
                      </summary>
                      <div className="submission-table">
                        <div className="table-row table-head">
                          <span>Estudiante</span>
                          <span>Estado</span>
                          <span>Fecha</span>
                          <span>Nota</span>
                          <span>Acción</span>
                        </div>
                        {students
                          .filter(({ student }) =>
                            student.name
                              .toLowerCase()
                              .includes(query.toLowerCase()),
                          )
                          .map(({ student }) => {
                            const submission = activity.submissions.find(
                                (s) => s.student.id === student.id,
                              ),
                              state = label(submission, activity.dueAt);
                            if (filter !== "ALL" && filter !== state)
                              return null;
                            return (
                              <div className="table-row" key={student.id}>
                                <span>
                                  <b>{student.name}</b>
                                  <small>{student.email}</small>
                                </span>
                                <span>
                                  <i
                                    className={`status ${state.toLowerCase().replaceAll(" ", "-")}`}
                                  >
                                    {state}
                                  </i>
                                </span>
                                <span>
                                  {submission
                                    ? new Date(
                                        submission.submittedAt,
                                      ).toLocaleDateString("es")
                                    : "—"}
                                </span>
                                <span>
                                  {submission?.score != null
                                    ? `${submission.score}/${activity.maxScore}`
                                    : "—"}
                                </span>
                                <span>
                                  <Link
                                    href={`/aulas/${id}/tareas/${activity.id}`}
                                  >
                                    Revisar
                                  </Link>
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          ))}
        </section>
      ))}
    </section>
  );
}
