"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import "../auth.css";
import { readApiResponse } from "@/lib/client-api";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm")) { setError("Las contraseñas no coinciden."); setLoading(false); return; }
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: data.get("name"), email: data.get("email"), password: data.get("password") }) });
    const result = await readApiResponse(response);
    if (!response.ok) { setError(String(result.error||"No se pudo crear la cuenta.")); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  return <main className="auth-page">
    <section className="auth-visual register-visual"><div className="visual-content"><div className="visual-mark"><GraduationCap size={30}/></div><h1>Tu aprendizaje<br/>comienza aquí.</h1><p>Accede a contenidos, actividades y acompañamiento desde cualquier lugar.</p><div className="benefit"><b>01</b><span><strong>Todo organizado</strong><small>Clases, recursos y entregas en un mismo espacio.</small></span></div><div className="benefit"><b>02</b><span><strong>Avanza a tu ritmo</strong><small>Consulta tu progreso y continúa donde lo dejaste.</small></span></div></div><div className="orb one"/><div className="orb two"/></section>
    <section className="auth-form-side"><div className="auth-box register-box"><Link className="auth-brand" href="/"><span><GraduationCap size={23}/></span>Aula<b>Nova</b></Link><div className="auth-copy"><small>ÚNETE A LA COMUNIDAD</small><h2>Crea tu cuenta</h2><p>Regístrate como alumno para comenzar.</p></div>
      <form onSubmit={submit}><label>Nombre completo<div className="input-wrap"><UserRound size={18}/><input name="name" placeholder="Tu nombre y apellido" autoComplete="name" minLength={3} required/></div></label><label>Correo electrónico<div className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required/></div></label><label>Contraseña<div className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Mostrar contraseña">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><label>Confirmar contraseña<div className="input-wrap"><LockKeyhole size={18}/><input name="confirm" type={showPassword ? "text" : "password"} placeholder="Repite tu contraseña" autoComplete="new-password" minLength={8} required/></div></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={19}/> : "Crear mi cuenta"}</button></form>
      <p className="auth-switch">¿Ya tienes una cuenta? <Link href="/login">Iniciar sesión</Link></p></div></section>
  </main>;
}
