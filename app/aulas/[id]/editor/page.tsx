"use client";
import Link from "next/link";
import { DragEvent, FormEvent, use, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Database,
  File as FileIcon,
  FileText,
  FolderOpen,
  GraduationCap,
  GripVertical,
  HelpCircle,
  ImageIcon,
  Layers3,
  Link2,
  ListChecks,
  MessageSquare,
  MonitorPlay,
  Music2,
  PanelsTopLeft,
  Pencil,
  Plus,
  Presentation,
  Radio,
  SeparatorHorizontal,
  Settings,
  Trash2,
  Upload,
  Video,
  Wrench,
} from "lucide-react";
import "./editor.css";
import "./structure-modal.css";
import { useAppDialogs } from "@/app/components/AppDialogs";

type Item = { id: string; title: string; type: string };
type Topic = {
  id: string;
  title: string;
  description: string | null;
  resources: Item[];
  activities: Item[];
};
type Lesson = {
  id: string;
  title: string;
  content: { text?: string } | null;
  topics: Topic[];
  resources: Item[];
  activities: Item[];
};
type Module = { id: string; title: string; lessons: Lesson[] };
type Target = { lessonId: string; topicId?: string; label: string };
type Dialog = {
  mode: "division" | "theme" | "element";
  parentId?: string;
  elementType?: string;
  target?: Target;
};
type StructureEdit = { kind: string; id: string; title: string; description: string };

const groups = [
  {
    title: "Organización",
    items: [
      { type: "SUBTOPIC", label: "Subtema", icon: FolderOpen },
      { type: "TEXT", label: "Texto y contenido", icon: FileText },
      { type: "PAGE", label: "Página", icon: PanelsTopLeft },
      { type: "DIVIDER", label: "Separador", icon: SeparatorHorizontal },
    ],
  },
  {
    title: "Recursos",
    items: [
      { type: "DOCUMENT", label: "Archivo", icon: FileIcon },
      { type: "PDF", label: "Documento PDF", icon: FileText },
      { type: "IMAGE", label: "Imagen", icon: ImageIcon },
      { type: "LINK", label: "Enlace", icon: Link2 },
      { type: "EMBED", label: "Contenido embebido", icon: PanelsTopLeft },
      { type: "LIVE_CLASS", label: "Clase en vivo", icon: Video },
      { type: "VIDEO", label: "Video", icon: Video },
      { type: "AUDIO", label: "Audio", icon: Music2 },
      { type: "PRESENTATION", label: "Presentación", icon: Presentation },
      { type: "INTERACTIVE", label: "SCORM / interactivo", icon: MonitorPlay },
    ],
  },
  {
    title: "Actividades",
    items: [
      { type: "ASSIGNMENT", label: "Tarea", icon: ClipboardCheck },
      { type: "QUIZ", label: "Cuestionario", icon: HelpCircle },
      { type: "FORUM", label: "Foro", icon: MessageSquare },
      { type: "PROJECT", label: "Proyecto", icon: BookOpen },
      { type: "CHOICE", label: "Elección", icon: Radio },
      { type: "SURVEY", label: "Encuesta", icon: ListChecks },
      { type: "WIKI", label: "Wiki", icon: BookMarked },
      { type: "GLOSSARY", label: "Glosario", icon: BookOpen },
      { type: "WORKSHOP", label: "Taller", icon: Wrench },
      { type: "DATABASE", label: "Base de datos", icon: Database },
    ],
  },
];
const activityTypes = new Set([
    "ASSIGNMENT",
    "QUIZ",
    "FORUM",
    "PROJECT",
    "CHOICE",
    "SURVEY",
    "WIKI",
    "GLOSSARY",
    "WORKSHOP",
    "DATABASE",
  ]),
  fileTypes = new Set([
    "DOCUMENT",
    "PDF",
    "IMAGE",
    "VIDEO",
    "AUDIO",
    "PRESENTATION",
  ]),
  linkTypes = new Set(["LINK", "EMBED", "LIVE_CLASS"]);
const labels: Record<string, string> = {
  SUBTOPIC: "Subtema",
  TEXT: "Texto y contenido",
  PAGE: "Página",
  DIVIDER: "Separador",
  DOCUMENT: "Archivo",
  PDF: "Documento PDF",
  IMAGE: "Imagen",
  LINK: "Enlace",
  EMBED: "Contenido embebido",
  LIVE_CLASS: "Clase en vivo",
  VIDEO: "Video",
  AUDIO: "Audio",
  PRESENTATION: "Presentación",
  INTERACTIVE: "SCORM / interactivo",
  ASSIGNMENT: "Tarea",
  QUIZ: "Cuestionario",
  FORUM: "Foro",
  PROJECT: "Proyecto",
  CHOICE: "Elección",
  SURVEY: "Encuesta",
  WIKI: "Wiki",
  GLOSSARY: "Glosario",
  WORKSHOP: "Taller",
  DATABASE: "Base de datos",
};

const displayText = (value?: string | null) =>
  (value || "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/[\uF0B7\u25A1]/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export default function CourseEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { confirm: confirmDialog } = useAppDialogs();
  const { id } = use(params),
    [title, setTitle] = useState("Curso"),
    [modules, setModules] = useState<Module[]>([]),
    [dialog, setDialog] = useState<Dialog | null>(null),
    [structureEdit, setStructureEdit] = useState<StructureEdit | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [query, setQuery] = useState("");
  async function load() {
    const response = await fetch(`/api/classrooms/${id}/editor`, {
        cache: "no-store",
      }),
      data = await response.json();
    if (response.ok) {
      setTitle(data.classroom.title);
      setModules(data.classroom.modules);
    } else setError(data.error);
  }
  useEffect(() => {
    load();
  }, [id]);
  useEffect(() => {
    const paragraphs = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".course-editor .themes summary p,.course-editor .subtopic>header p",
      ),
    );
    paragraphs.forEach((node) => {
      node.textContent = displayText(node.textContent);
    });
  }, [modules]);
  useEffect(() => {
    const moduleNodes = Array.from(
        document.querySelectorAll<HTMLElement>(".division>header"),
      ),
      lessonNodes = Array.from(
        document.querySelectorAll<HTMLElement>(".themes>details>summary"),
      ),
      topicNodes = Array.from(
        document.querySelectorAll<HTMLElement>(".subtopic>header"),
      ),
      lessons = modules.flatMap((module) => module.lessons),
      topics = lessons.flatMap((lesson) => lesson.topics),
      buttons: Array<HTMLButtonElement> = [];
    function add(
      node: HTMLElement | undefined,
      kind: string,
      item:
        | {
            id: string;
            title: string;
            description?: string | null;
            content?: { text?: string } | null;
          }
        | undefined,
    ) {
      if (!node || !item) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "structure-edit";
      button.textContent = "✎ Editar";
      button.onclick = () => editStructure(kind, item);
      node.appendChild(button);
      buttons.push(button);
    }
    modules.forEach((item, index) => add(moduleNodes[index], "module", item));
    lessons.forEach((item, index) => add(lessonNodes[index], "lesson", item));
    topics.forEach((item, index) => add(topicNodes[index], "topic", item));
    return () => buttons.forEach((button) => button.remove());
  }, [modules]);
  const itemCount = useMemo(
    () =>
      modules.reduce(
        (sum, module) =>
          sum +
          module.lessons.reduce(
            (lessonSum, lesson) =>
              lessonSum +
              lesson.topics.length +
              lesson.resources.length +
              lesson.activities.length +
              lesson.topics.reduce(
                (topicSum, topic) =>
                  topicSum + topic.resources.length + topic.activities.length,
                0,
              ),
            0,
          ),
        0,
      ),
    [modules],
  );
  async function request(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const response = await fetch(`/api/classrooms/${id}/editor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      data = await response.json();
    if (response.ok) {
      setDialog(null);
      await load();
    } else setError(data.error);
    setBusy(false);
    return response.ok;
  }
  function editStructure(
    kind: string,
    item: {
      id: string;
      title: string;
      description?: string | null;
      content?: { text?: string } | null;
    },
  ) {
    setStructureEdit({kind,id:item.id,title:item.title,description:item.description||item.content?.text||""});
  }
  async function saveStructure(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!structureEdit)return;const form=new FormData(event.currentTarget);
    const ok=await request({
      action: "update_structure",
      kind:structureEdit.kind,
      elementId:structureEdit.id,
      title:form.get("title"),
      description:form.get("description"),
    });
    if(ok)setStructureEdit(null);
  }
  function startPalette(event: DragEvent, type: string) {
    event.dataTransfer.setData(
      "application/x-aulanova",
      JSON.stringify({ source: "palette", type }),
    );
    event.dataTransfer.effectAllowed = "copy";
  }
  function startItem(event: DragEvent, kind: string, elementId: string) {
    event.dataTransfer.setData(
      "application/x-aulanova",
      JSON.stringify({ source: "course", kind, elementId }),
    );
    event.dataTransfer.effectAllowed = "move";
  }
  function drop(event: DragEvent, target: Target) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");
    try {
      const data = JSON.parse(
        event.dataTransfer.getData("application/x-aulanova"),
      );
      if (data.source === "palette")
        setDialog({ mode: "element", elementType: data.type, target });
      else if (data.source === "course")
        request({
          action: "move_element",
          kind: data.kind,
          elementId: data.elementId,
          lessonId: target.lessonId,
          topicId: target.topicId,
        });
    } catch {
      setError("No se pudo interpretar el elemento arrastrado.");
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const form = new FormData(event.currentTarget);
    if (dialog.mode === "division")
      return void request({ action: "division", title: form.get("title") });
    if (dialog.mode === "theme")
      return void request({
        action: "theme",
        parentId: dialog.parentId,
        title: form.get("title"),
        description: form.get("description"),
      });
    let url = String(form.get("url") || ""),
      size: number | undefined;
    const file = form.get("file");
    if (file instanceof File && file.size) {
      if (dialog.elementType === "INTERACTIVE") {
        const upload = new FormData();
        upload.set("file", file);
        upload.set("classroomId", id);
        upload.set("lessonId", dialog.target!.lessonId);
        upload.set("title", String(form.get("title")));
        setBusy(true);
        const response = await fetch("/api/scorm/upload", {
            method: "POST",
            body: upload,
          }),
          data = await response.json();
        if (!response.ok) {
          setError(data.error);
          setBusy(false);
          return;
        }
        if (dialog.target?.topicId)
          await request({
            action: "move_element",
            kind: "resource",
            elementId: data.resource.id,
            lessonId: dialog.target.lessonId,
            topicId: dialog.target.topicId,
          });
        else {
          setDialog(null);
          await load();
          setBusy(false);
        }
        return;
      }
      const upload = new FormData();
      upload.set("file", file);
      upload.set("classroomId", id);
      setBusy(true);
      const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: upload,
        }),
        data = await response.json();
      if (!response.ok) {
        setError(data.error);
        setBusy(false);
        return;
      }
      url = data.url;
      size = data.size;
    }
    await request({
      action: "create_element",
      elementType: dialog.elementType,
      lessonId: dialog.target?.lessonId,
      topicId: dialog.target?.topicId,
      title: form.get("title"),
      description: form.get("description"),
      url,
      size,
      dueAt: form.get("dueAt"),
      maxScore: form.get("maxScore"),
    });
  }
  async function remove(kind: string, elementId: string, title: string) {
    if (await confirmDialog(`¿Eliminar “${title}”? Esta acción no se puede deshacer.`,"Eliminar elemento"))
      await request({ action: "delete_element", kind, elementId });
  }
  function DropZone({
    target,
    compact = false,
  }: {
    target: Target;
    compact?: boolean;
  }) {
    return (
      <div
        className={`drop-zone ${compact ? "compact" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          event.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(event) =>
          event.currentTarget.classList.remove("drag-over")
        }
        onDrop={(event) => drop(event, target)}
      >
        <Plus />
        {compact
          ? "Soltar o añadir elemento"
          : "Arrastra aquí una actividad o recurso"}
        <button
          onClick={() =>
            setDialog({ mode: "element", elementType: "TEXT", target })
          }
        >
          Añadir
        </button>
      </div>
    );
  }
  function Element({
    item,
    kind,
  }: {
    item: Item;
    kind: "resource" | "activity";
  }) {
    const Icon =
      kind === "activity"
        ? ClipboardCheck
        : item.type === "VIDEO"
          ? Video
          : item.type === "AUDIO"
            ? Music2
            : item.type === "INTERACTIVE"
              ? MonitorPlay
              : FileIcon;
    return (
      <div
        className={`course-element ${kind}`}
        draggable
        onDragStart={(event) => startItem(event, kind, item.id)}
      >
        <GripVertical />
        <span className="element-icon">
          <Icon />
        </span>
        <div>
          <b>{item.title}</b>
          <small>{labels[item.type] || item.type}</small>
        </div>
        <button
          title="Eliminar"
          onClick={() => remove(kind, item.id, item.title)}
        >
          <Trash2 />
        </button>
      </div>
    );
  }
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <main className="course-editor">
      <header>
        <Link href={`/aulas/${id}`}>
          <ArrowLeft />
          Volver al aula
        </Link>
        <span>
          <GraduationCap />
          Aula<b>Nova</b>
        </span>
        <b className="edit-status">Modo edición</b>
      </header>
      <div className="editor-shell">
        <section className="editor-heading">
          <div>
            <small>EDITOR PROFESIONAL DE CURSOS</small>
            <h1>{title}</h1>
            <p>
              {modules.length} unidades ·{" "}
              {modules.reduce((sum, module) => sum + module.lessons.length, 0)}{" "}
              temas · {itemCount} elementos
            </p>
          </div>
          <button onClick={() => setDialog({ mode: "division" })}>
            <Plus />
            Nueva unidad
          </button>
        </section>
        {error && (
          <div className="editor-error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        <div className="builder-layout">
          <aside className="element-library">
            <h2>Elementos</h2>
            <p>Arrastra un elemento hasta cualquier zona punteada.</p>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar elemento…"
            />
            {filteredGroups.map((group) => (
              <section key={group.title}>
                <small>{group.title}</small>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      draggable
                      onDragStart={(event) => startPalette(event, item.type)}
                      onClick={() => {
                        const first = modules[0]?.lessons[0];
                        if (first)
                          setDialog({
                            mode: "element",
                            elementType: item.type,
                            target: { lessonId: first.id, label: first.title },
                          });
                      }}
                    >
                      <span>
                        <Icon />
                      </span>
                      <div>
                        <b>{item.label}</b>
                        <small>Arrastrar al curso</small>
                      </div>
                      <GripVertical />
                    </button>
                  );
                })}
              </section>
            ))}
          </aside>
          <section className="curriculum">
            {modules.map((module, moduleIndex) => (
              <article
                className="division"
                id={`division-${module.id}`}
                key={module.id}
              >
                <header>
                  <GripVertical />
                  <span>{moduleIndex + 1}</span>
                  <div>
                    <small>UNIDAD {moduleIndex + 1}</small>
                    <h2>{module.title}</h2>
                  </div>
                  <button
                    onClick={() =>
                      setDialog({ mode: "theme", parentId: module.id })
                    }
                  >
                    <Plus />
                    Añadir tema
                  </button>
                </header>
                <div className="themes">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <details key={lesson.id} open>
                      <summary>
                        <ChevronDown />
                        <div>
                          <small>
                            TEMA {moduleIndex + 1}.{lessonIndex + 1}
                          </small>
                          <h3>{lesson.title}</h3>
                          <p>{lesson.content?.text || "Sin descripción"}</p>
                        </div>
                      </summary>
                      <div className="lesson-content">
                        <DropZone
                          target={{ lessonId: lesson.id, label: lesson.title }}
                        />
                        {lesson.resources.map((item) => (
                          <Element key={item.id} item={item} kind="resource" />
                        ))}
                        {lesson.activities.map((item) => (
                          <Element key={item.id} item={item} kind="activity" />
                        ))}
                        {lesson.topics.map((topic, topicIndex) => (
                          <section
                            className="subtopic"
                            key={topic.id}
                            draggable
                            onDragStart={(event) =>
                              startItem(event, "topic", topic.id)
                            }
                          >
                            <header>
                              <GripVertical />
                              <span>
                                {moduleIndex + 1}.{lessonIndex + 1}.
                                {topicIndex + 1}
                              </span>
                              <div>
                                <b>{topic.title}</b>
                                <p>{topic.description}</p>
                              </div>
                              <button
                                onClick={() =>
                                  remove("topic", topic.id, topic.title)
                                }
                              >
                                <Trash2 />
                              </button>
                            </header>
                            <div className="subtopic-items">
                              {topic.resources.map((item) => (
                                <Element
                                  key={item.id}
                                  item={item}
                                  kind="resource"
                                />
                              ))}
                              {topic.activities.map((item) => (
                                <Element
                                  key={item.id}
                                  item={item}
                                  kind="activity"
                                />
                              ))}
                              <DropZone
                                compact
                                target={{
                                  lessonId: lesson.id,
                                  topicId: topic.id,
                                  label: topic.title,
                                }}
                              />
                            </div>
                          </section>
                        ))}
                      </div>
                    </details>
                  ))}
                  {!module.lessons.length && (
                    <div className="unit-empty">
                      Añade el primer tema de esta unidad.
                    </div>
                  )}
                </div>
              </article>
            ))}
            {!modules.length && (
              <div className="editor-empty">
                <Layers3 />
                <h2>Tu curso comienza con una unidad</h2>
                <p>
                  Crea una unidad, añade temas y arrastra recursos o actividades
                  desde la biblioteca.
                </p>
                <button onClick={() => setDialog({ mode: "division" })}>
                  <Plus />
                  Crear primera unidad
                </button>
              </div>
            )}
          </section>
          <aside className="course-outline">
            <h2>Índice del curso</h2>
            {modules.map((module, index) => (
              <a href={`#division-${module.id}`} key={module.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{module.title}</b>
                  <small>{module.lessons.length} temas</small>
                </div>
              </a>
            ))}
          </aside>
        </div>
      </div>
      {structureEdit && <div className="editor-modal" onMouseDown={()=>setStructureEdit(null)}><form onSubmit={saveStructure} onMouseDown={event=>event.stopPropagation()}><small>EDITAR CONTENIDO</small><h2>Editar {structureEdit.kind==="module"?"unidad":structureEdit.kind==="lesson"?"tema":"subtema"}</h2><label>Título<input name="title" defaultValue={structureEdit.title} required minLength={3} autoFocus/></label>{structureEdit.kind!=="module"&&<label>Contenido<textarea className="structure-content" name="description" defaultValue={structureEdit.description} placeholder="Escribe el contenido. Se conservarán los saltos de línea."/></label>}{error&&<p className="modal-error">{error}</p>}<div className="modal-actions"><button type="button" onClick={()=>setStructureEdit(null)}>Cancelar</button><button disabled={busy}>{busy?<Upload className="spin"/>:"Guardar cambios"}</button></div></form></div>}
      {dialog && (
        <div className="editor-modal" onMouseDown={() => setDialog(null)}>
          <form
            onSubmit={save}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <small>
              {dialog.mode === "division"
                ? "NUEVA UNIDAD"
                : dialog.mode === "theme"
                  ? "NUEVO TEMA"
                  : labels[dialog.elementType || ""]}
            </small>
            <h2>
              {dialog.mode === "element"
                ? `Añadir a ${dialog.target?.label}`
                : "Organizar el curso"}
            </h2>
            <label>
              Título
              <input name="title" required minLength={3} autoFocus />
            </label>
            {dialog.mode !== "division" && (
              <label>
                Descripción
                <textarea
                  name="description"
                  placeholder="Instrucciones o contenido…"
                />
              </label>
            )}
            {dialog.mode === "element" &&
              fileTypes.has(dialog.elementType || "") && (
                <label>
                  Archivo
                  <input name="file" type="file" required />
                </label>
              )}
            {dialog.mode === "element" &&
              dialog.elementType === "INTERACTIVE" && (
                <label>
                  Paquete SCORM
                  <input name="file" type="file" accept=".zip,.rar" required />
                </label>
              )}
            {dialog.mode === "element" &&
              linkTypes.has(dialog.elementType || "") && (
                <label>
                  URL
                  <input
                    name="url"
                    type="url"
                    required
                    placeholder="https://…"
                  />
                </label>
              )}
            {dialog.mode === "element" &&
              activityTypes.has(dialog.elementType || "") && (
                <div className="form-grid">
                  <label>
                    Fecha límite
                    <input name="dueAt" type="datetime-local" />
                  </label>
                  <label>
                    Puntuación
                    <input
                      name="maxScore"
                      type="number"
                      min="1"
                      defaultValue="100"
                    />
                  </label>
                </div>
              )}
            {error && <p className="modal-error">{error}</p>}
            <div className="modal-actions">
              <button type="button" onClick={() => setDialog(null)}>
                Cancelar
              </button>
              <button disabled={busy}>
                {busy ? <Upload className="spin" /> : "Guardar elemento"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
