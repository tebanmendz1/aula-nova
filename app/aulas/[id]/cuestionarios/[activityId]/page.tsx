"use client";
import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckSquare,
  ChevronRight,
  HelpCircle,
  ListChecks,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useAppDialogs } from "@/app/components/AppDialogs";
import "./quiz-builder.css";
type Question = {
  id: string;
  prompt: string;
  questionType:
    | "SINGLE_CHOICE"
    | "MULTIPLE_CHOICE"
    | "TRUE_FALSE"
    | "SHORT_TEXT";
  options: string[];
  correctAnswer: string;
  points: number;
  explanation: string | null;
  position: number;
};
type Activity = {
  id: string;
  title: string;
  description: string | null;
  maxScore: number;
  dueAt: string | null;
  lesson: {
    title: string;
    module: { title: string; classroom: { title: string } };
  };
  topic: { title: string } | null;
  quizQuestions: Question[];
};
const typeLabels = {
    SINGLE_CHOICE: "Opción única",
    MULTIPLE_CHOICE: "Selección múltiple",
    TRUE_FALSE: "Verdadero o falso",
    SHORT_TEXT: "Respuesta corta",
  },
  icons = {
    SINGLE_CHOICE: ListChecks,
    MULTIPLE_CHOICE: CheckSquare,
    TRUE_FALSE: HelpCircle,
    SHORT_TEXT: Type,
  };
export default function QuizBuilder({
  params,
}: {
  params: Promise<{ id: string; activityId: string }>;
}) {
  const { id, activityId } = use(params),
    [activity, setActivity] = useState<Activity | null>(null),
    [editing, setEditing] = useState<Question | "new" | null>(null),
    [kind, setKind] = useState<Question["questionType"]>("SINGLE_CHOICE"),
    [options, setOptions] = useState(["", ""]),
    [correct, setCorrect] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { confirm } = useAppDialogs();
  async function load() {
    const r = await fetch(`/api/classrooms/${id}/quizzes/${activityId}`, {
        cache: "no-store",
      }),
      d = await r.json();
    if (r.ok) setActivity(d.activity);
    else setError(d.error);
  }
  useEffect(() => {
    load();
  }, [id, activityId]);
  function open(question: Question | "new") {
    setEditing(question);
    setError("");
    if (question === "new") {
      setKind("SINGLE_CHOICE");
      setOptions(["", ""]);
      setCorrect([]);
    } else {
      setKind(question.questionType);
      setOptions(question.options.length ? question.options : ["", ""]);
      setCorrect(
        question.questionType === "MULTIPLE_CHOICE"
          ? JSON.parse(question.correctAnswer)
          : [question.correctAnswer],
      );
    }
  }
  async function post(payload: object) {
    setBusy(true);
    setError("");
    const r = await fetch(`/api/classrooms/${id}/quizzes/${activityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      d = await r.json();
    if (!r.ok) {
      setError(d.error);
      setBusy(false);
      return false;
    }
    await load();
    setBusy(false);
    return true;
  }
  async function saveQuestion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      clean =
        kind === "TRUE_FALSE"
          ? ["Verdadero", "Falso"]
          : kind === "SHORT_TEXT"
            ? []
            : options.map((x) => x.trim()).filter(Boolean),
      answers =
        kind === "SHORT_TEXT"
          ? [String(f.get("shortAnswer") || "").trim()]
          : correct;
    if (
      await post({
        action: "save_question",
        questionId: editing !== "new" ? editing?.id : undefined,
        prompt: f.get("prompt"),
        questionType: kind,
        options: clean,
        correctAnswers: answers,
        points: f.get("points"),
        explanation: f.get("explanation"),
      })
    )
      setEditing(null);
  }
  async function remove(q: Question) {
    if (
      await confirm(`¿Eliminar la pregunta “${q.prompt}”?`, "Eliminar pregunta")
    )
      await post({ action: "delete_question", questionId: q.id });
  }
  if (!activity)
    return (
      <main className="quiz-builder-state">
        {error || (
          <>
            <LoaderCircle className="spin" />
            Cargando constructor…
          </>
        )}
      </main>
    );
  const total = activity.quizQuestions.reduce((s, q) => s + q.points, 0);
  return (
    <main className="quiz-builder">
      <header>
        <Link href={`/aulas/${id}/editor`}>
          <ArrowLeft />
          Volver al editor
        </Link>
        <strong>Constructor de cuestionarios</strong>
        <Link href={`/aulas/${id}?preview=student`} target="_blank">
          Vista previa
        </Link>
      </header>
      <div className="quiz-shell">
        <nav className="quiz-breadcrumb">
          <span>{activity.lesson.module.classroom.title}</span>
          <ChevronRight />
          <span>{activity.lesson.module.title}</span>
          <ChevronRight />
          <span>{activity.lesson.title}</span>
          {activity.topic && (
            <>
              <ChevronRight />
              <span>{activity.topic.title}</span>
            </>
          )}
        </nav>
        <section className="quiz-hero">
          <div>
            <small>CUESTIONARIO PROFESIONAL</small>
            <h1>{activity.title}</h1>
            <p>{activity.description || "Sin instrucciones adicionales."}</p>
          </div>
          <div>
            <b>{activity.quizQuestions.length}</b>
            <span>preguntas</span>
            <b>{total}</b>
            <span>puntos configurados</span>
          </div>
        </section>
        <div className="quiz-layout">
          <section>
            <div className="question-toolbar">
              <div>
                <h2>Banco de preguntas</h2>
                <p>El orden mostrado será el mismo para el alumno.</p>
              </div>
              <button onClick={() => open("new")}>
                <Plus />
                Nueva pregunta
              </button>
            </div>
            <div className="question-list">
              {activity.quizQuestions.map((q, index) => {
                const Icon = icons[q.questionType];
                return (
                  <article key={q.id}>
                    <span>{index + 1}</span>
                    <Icon />
                    <div>
                      <small>
                        {typeLabels[q.questionType]} · {q.points} puntos
                      </small>
                      <h3>{q.prompt}</h3>
                      <p>{q.options.join(" · ") || "Respuesta escrita"}</p>
                    </div>
                    <div className="question-actions">
                      <button
                        disabled={index === 0}
                        onClick={() =>
                          post({
                            action: "move_question",
                            questionId: q.id,
                            direction: "up",
                          })
                        }
                      >
                        <ArrowUp />
                      </button>
                      <button
                        disabled={index === activity.quizQuestions.length - 1}
                        onClick={() =>
                          post({
                            action: "move_question",
                            questionId: q.id,
                            direction: "down",
                          })
                        }
                      >
                        <ArrowDown />
                      </button>
                      <button onClick={() => open(q)}>
                        <Pencil />
                      </button>
                      <button onClick={() => remove(q)}>
                        <Trash2 />
                      </button>
                    </div>
                  </article>
                );
              })}
              {!activity.quizQuestions.length && (
                <div className="quiz-empty">
                  <HelpCircle />
                  <h3>Añade la primera pregunta</h3>
                  <p>Puedes combinar varios tipos de respuesta.</p>
                  <button onClick={() => open("new")}>
                    <Plus />
                    Crear pregunta
                  </button>
                </div>
              )}
            </div>
          </section>
          <aside>
            <Settings />
            <h2>Resumen</h2>
            <dl>
              <div>
                <dt>Ubicación</dt>
                <dd>
                  {activity.lesson.module.title}
                  <br />
                  {activity.lesson.title}
                  {activity.topic && (
                    <>
                      <br />
                      {activity.topic.title}
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt>Puntaje máximo</dt>
                <dd>{activity.maxScore}</dd>
              </div>
              <div>
                <dt>Suma de preguntas</dt>
                <dd
                  className={total === activity.maxScore ? "valid" : "warning"}
                >
                  {total}
                </dd>
              </div>
            </dl>
            {total !== activity.maxScore && (
              <p>
                La suma de puntos no coincide con el puntaje máximo del
                cuestionario.
              </p>
            )}
            <Link href={`/aulas/${id}/interaccion`}>Abrir cuestionarios</Link>
          </aside>
        </div>
      </div>
      {editing && (
        <div className="question-modal" onMouseDown={() => setEditing(null)}>
          <form
            onSubmit={saveQuestion}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="question-close"
              onClick={() => setEditing(null)}
            >
              <X />
            </button>
            <small>
              {editing === "new" ? "NUEVA PREGUNTA" : "EDITAR PREGUNTA"}
            </small>
            <h2>Configurar pregunta</h2>
            <label>
              Tipo de respuesta
              <select
                value={kind}
                onChange={(e) => {
                  const value = e.target.value as Question["questionType"];
                  setKind(value);
                  setCorrect([]);
                  if (value === "TRUE_FALSE")
                    setOptions(["Verdadero", "Falso"]);
                }}
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Enunciado
              <textarea
                name="prompt"
                defaultValue={editing !== "new" ? editing.prompt : ""}
                required
              />
            </label>
            {kind !== "SHORT_TEXT" && kind !== "TRUE_FALSE" && (
              <fieldset>
                <legend>Opciones de respuesta</legend>
                {options.map((option, index) => (
                  <div className="option-row" key={index}>
                    <input
                      type={kind === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                      name="correct"
                      checked={correct.includes(option) && !!option}
                      onChange={() =>
                        setCorrect((current) =>
                          kind === "MULTIPLE_CHOICE"
                            ? current.includes(option)
                              ? current.filter((x) => x !== option)
                              : [...current, option]
                            : [option],
                        )
                      }
                    />
                    <input
                      value={option}
                      onChange={(e) =>
                        setOptions((current) =>
                          current.map((x, i) =>
                            i === index ? e.target.value : x,
                          ),
                        )
                      }
                      placeholder={`Opción ${index + 1}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setOptions((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-option"
                  onClick={() => setOptions((current) => [...current, ""])}
                >
                  <Plus />
                  Añadir opción
                </button>
              </fieldset>
            )}
            {kind === "TRUE_FALSE" && (
              <label>
                Respuesta correcta
                <select
                  value={correct[0] || ""}
                  onChange={(e) => setCorrect([e.target.value])}
                  required
                >
                  <option value="">Selecciona…</option>
                  <option>Verdadero</option>
                  <option>Falso</option>
                </select>
              </label>
            )}
            {kind === "SHORT_TEXT" && (
              <label>
                Respuesta correcta
                <input
                  name="shortAnswer"
                  defaultValue={editing !== "new" ? editing.correctAnswer : ""}
                  required
                  placeholder="Respuesta esperada"
                />
              </label>
            )}
            <div className="question-grid">
              <label>
                Puntos
                <input
                  name="points"
                  type="number"
                  min="0.1"
                  step="0.1"
                  defaultValue={editing !== "new" ? editing.points : 1}
                  required
                />
              </label>
              <label>
                Retroalimentación
                <textarea
                  name="explanation"
                  defaultValue={
                    editing !== "new" ? editing.explanation || "" : ""
                  }
                  placeholder="Explicación opcional después de responder"
                />
              </label>
            </div>
            {error && <p className="question-error">{error}</p>}
            <footer>
              <button type="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button disabled={busy}>
                <Save />
                {busy ? "Guardando…" : "Guardar pregunta"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </main>
  );
}
