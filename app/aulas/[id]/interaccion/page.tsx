"use client";
import Link from "next/link";
import { FormEvent, use, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  HelpCircle,
  LoaderCircle,
  MessageSquare,
  Send,
} from "lucide-react";
import "./interaction.css";

type Item = {
  id: string;
  title: string;
  description: string | null;
  type: "QUIZ" | "FORUM";
  lesson: { title: string; module: { title: string } };
  maxScore: number;
  quizQuestions: {
    id: string;
    prompt: string;
    options: string[];
    points: number;
    questionType:
      | "SINGLE_CHOICE"
      | "MULTIPLE_CHOICE"
      | "TRUE_FALSE"
      | "SHORT_TEXT";
    correctAnswer?: string;
  }[];
  quizAttempts: { id: string; score: number; student: { name: string } }[];
  forumPosts: {
    id: string;
    body: string;
    createdAt: string;
    author: { name: string; role: string };
  }[];
};

export default function Interaction({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [items, setItems] = useState<Item[]>([]),
    [role, setRole] = useState("STUDENT"),
    [loading, setLoading] = useState(true);
  async function load() {
    const response = await fetch(`/api/classrooms/${id}/engagement`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok) {
      setItems(data.activities);
      setRole(data.role);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [id]);
  async function post(payload: object) {
    const response = await fetch(`/api/classrooms/${id}/engagement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) await load();
    return response.ok;
  }
  async function quiz(event: FormEvent<HTMLFormElement>, item: Item) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const answers = Object.fromEntries(
      item.quizQuestions.map((q) => [
        q.id,
        q.questionType === "MULTIPLE_CHOICE"
          ? form.getAll(q.id)
          : form.get(q.id),
      ]),
    );
    await post({ action: "quiz_attempt", activityId: item.id, answers });
  }
  async function forum(event: FormEvent<HTMLFormElement>, activityId: string) {
    event.preventDefault();
    const element = event.currentTarget,
      form = new FormData(element);
    if (
      await post({ action: "forum_post", activityId, body: form.get("body") })
    )
      element.reset();
  }
  if (loading)
    return (
      <main className="interaction-state">
        <LoaderCircle className="spin" />
        Cargando…
      </main>
    );
  return (
    <main className="interaction-page">
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
      <div className="interaction-body">
        <div className="interaction-title">
          <small>APRENDIZAJE INTERACTIVO</small>
          <h1>Cuestionarios y foros</h1>
          <p>Evalúa conocimientos y participa con tu comunidad.</p>
        </div>
        {items.map((item) => (
          <article className="interaction-card" key={item.id}>
            <div className="interaction-card-title">
              <span>
                {item.type === "QUIZ" ? <HelpCircle /> : <MessageSquare />}
              </span>
              <div>
                <small>
                  {item.lesson.module.title} · {item.lesson.title} ·{" "}
                  {item.type === "QUIZ" ? "CUESTIONARIO" : "FORO"}
                </small>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              {role !== "STUDENT" && item.type === "QUIZ" && (
                <Link href={`/aulas/${id}/cuestionarios/${item.id}`}>
                  Configurar cuestionario
                </Link>
              )}
            </div>
            {item.type === "QUIZ" &&
              (role === "STUDENT" ? (
                <form
                  className="quiz-form"
                  onSubmit={(event) => quiz(event, item)}
                >
                  {item.quizQuestions.map((q, index) => (
                    <fieldset key={q.id}>
                      <legend>
                        {index + 1}. {q.prompt} <small>{q.points} pts</small>
                      </legend>
                      {q.questionType === "SHORT_TEXT" ? (
                        <input
                          className="quiz-short-answer"
                          name={q.id}
                          placeholder="Escribe tu respuesta"
                          required
                        />
                      ) : (
                        q.options.map((option) => (
                          <label key={option}>
                            <input
                              type={
                                q.questionType === "MULTIPLE_CHOICE"
                                  ? "checkbox"
                                  : "radio"
                              }
                              name={q.id}
                              value={option}
                              required={q.questionType !== "MULTIPLE_CHOICE"}
                            />
                            {option}
                          </label>
                        ))
                      )}
                    </fieldset>
                  ))}
                  {item.quizAttempts[0] ? (
                    <div className="quiz-result">
                      <CheckCircle2 />
                      Resultado: <b>{item.quizAttempts[0].score} puntos</b>
                    </div>
                  ) : item.quizQuestions.length ? (
                    <button>Enviar respuestas</button>
                  ) : (
                    <p>Aún no hay preguntas.</p>
                  )}
                </form>
              ) : (
                <div className="attempts">
                  <b>
                    {item.quizQuestions.length} preguntas ·{" "}
                    {item.quizAttempts.length} intentos
                  </b>
                  {item.quizAttempts.map((attempt) => (
                    <span key={attempt.id}>
                      {attempt.student.name}
                      <strong>{attempt.score} pts</strong>
                    </span>
                  ))}
                </div>
              ))}
            {item.type === "FORUM" && (
              <div className="forum">
                <div className="posts">
                  {item.forumPosts.map((post) => (
                    <div key={post.id}>
                      <span>{post.author.name.slice(0, 2).toUpperCase()}</span>
                      <div>
                        <b>{post.author.name}</b>
                        <small>
                          {new Date(post.createdAt).toLocaleString("es")}
                        </small>
                        <p>{post.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={(event) => forum(event, item.id)}>
                  <textarea
                    name="body"
                    placeholder="Escribe tu aporte…"
                    required
                  />
                  <button>
                    <Send />
                    Publicar
                  </button>
                </form>
              </div>
            )}
          </article>
        ))}
        {!items.length && (
          <div className="interaction-empty">
            El docente todavía no ha creado cuestionarios o foros.
          </div>
        )}
      </div>
    </main>
  );
}
