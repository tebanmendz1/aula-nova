"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import "../auth.css";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error); setLoading(false); return; }
    router.push("/"); router.refresh();
  }

  return <main className="auth-page">
    <section className="auth-visual"><div className="visual-content"><div className="visual-mark"><GraduationCap size={30}/></div><h1>Enseña, aprende y<br/>crece en un solo lugar.</h1><p>Una experiencia educativa sencilla y cercana para toda tu comunidad.</p><div className="visual-quote"><span>“</span><p>AulaNova transformó la manera en que acompaño el progreso de mis estudiantes.</p><small>— Julia Salazar, docente</small></div></div><div className="orb one"/><div className="orb two"/></section>
    <section className="auth-form-side"><div className="auth-box"><Link className="auth-brand" href="/"><span><GraduationCap size={23}/></span>Aula<b>Nova</b></Link><div className="auth-copy"><small>BIENVENIDO DE NUEVO</small><h2>Inicia sesión</h2><p>Ingresa tus datos para continuar a tu aula.</p></div>
      <form onSubmit={submit}><label>Correo electrónico<div className="input-wrap"><Mail size={18}/><input name="email" type="email" placeholder="tu@correo.com" autoComplete="email" required/></div></label><label>Contraseña<div className="input-wrap"><LockKeyhole size={18}/><input name="password" type={showPassword ? "text" : "password"} placeholder="Tu contraseña" autoComplete="current-password" required/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Mostrar contraseña">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label><div className="form-meta"><label className="check"><input type="checkbox"/>Recordarme</label><Link href="/recuperar" className="link-button">¿Olvidaste tu contraseña?</Link></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="auth-submit" disabled={loading}>{loading ? <LoaderCircle className="spin" size={19}/> : "Iniciar sesión"}</button></form>
      <p className="auth-switch">¿Aún no tienes una cuenta? <Link href="/registro">Crear cuenta</Link></p><small className="terms">Al continuar aceptas nuestros términos y política de privacidad.</small></div></section>
  </main>;
}
