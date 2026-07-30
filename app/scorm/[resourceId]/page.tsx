"use client";
import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ScormPlayer({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = use(params), search = useSearchParams(), launch = search.get("launch") || "index.html";
  const [error, setError] = useState("");

  useEffect(() => {
    const values: Record<string, string> = { "cmi.core.lesson_status": "incomplete", "cmi.completion_status": "incomplete" };
    const api = {
      LMSInitialize: () => "true", LMSFinish: () => "true", LMSGetValue: (key: string) => values[key] || "",
      LMSSetValue: (key: string, value: string) => (values[key] = String(value), "true"), LMSCommit: () => "true",
      LMSGetLastError: () => "0", LMSGetErrorString: () => "No error", LMSGetDiagnostic: () => "No error",
      Initialize: () => "true", Terminate: () => "true", GetValue: (key: string) => values[key] || "",
      SetValue: (key: string, value: string) => (values[key] = String(value), "true"), Commit: () => "true",
      GetLastError: () => "0", GetErrorString: () => "No error", GetDiagnostic: () => "No error",
    };
    Object.assign(window, { API: api, API_1484_11: api });

    const clean = launch.split("/").filter(part => part && part !== "." && part !== "..");
    const encoded = clean.map(encodeURIComponent).join("/");
    const directory = clean.slice(0, -1).map(encodeURIComponent).join("/");
    const controller = new AbortController();
    fetch(`/api/scorm/${resourceId}/${encoded}`, { credentials: "same-origin", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(`No se encontró el archivo de inicio (${response.status}).`);
        let html = await response.text();
        const base = `<base href="/api/scorm/${encodeURIComponent(resourceId)}/${directory ? `${directory}/` : ""}">`;
        const responsive = `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style id="aulanova-responsive-scorm">html,body{margin:0;min-width:0;min-height:100%;max-width:100%;overflow:auto}video,img,canvas,svg,object,embed,iframe{max-width:100%}video{width:100%;height:auto;max-height:100vh;object-fit:contain}iframe{max-height:100vh}</style>`;
        html = /<head[^>]*>/i.test(html) ? html.replace(/<head([^>]*)>/i, `<head$1>${base}${responsive}`) : `${base}${responsive}${html}`;
        document.open();
        document.write(html);
        document.close();
      })
      .catch(reason => { if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "No se pudo abrir el paquete SCORM."); });
    return () => controller.abort();
  }, [resourceId, launch]);

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 30, fontFamily: "sans-serif", color: "#555" }}>{error || "Cargando simulación…"}</main>;
}
