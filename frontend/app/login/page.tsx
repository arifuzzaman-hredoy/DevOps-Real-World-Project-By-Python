"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok && router.replace("/dashboard")); }, [router]);
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); const csrf = await fetch("/api/auth/csrf", { credentials:"include" }).then(r => r.json()); const r = await fetch("/api/auth/login", {method:"POST", headers:{"Content-Type":"application/json", "X-CSRF-Token": csrf.csrf_token}, credentials:"include", body:JSON.stringify({password})}); setBusy(false); if (r.ok) router.replace("/dashboard"); else setError("Incorrect password. Please try again."); }
  return <main className="login"><section className="loginCard"><div className="logo">⬡</div><p className="eyebrow">Secure learning operations</p><h1>CST Study Matrix</h1><p>Sign in to open your personal progress command centre.</p><form onSubmit={submit}><label>Study password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus required /></label>{error && <p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy ? "Signing in…" : "Open dashboard →"}</button></form></section></main>;
}
