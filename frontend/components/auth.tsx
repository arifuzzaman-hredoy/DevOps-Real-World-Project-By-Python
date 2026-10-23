"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [ready, setReady] = useState(false);
  useEffect(() => { fetch("/api/auth/me", { credentials: "include" }).then(r => r.ok ? setReady(true) : router.replace("/login")).catch(() => router.replace("/login")); }, [router]);
  return ready ? <>{children}</> : <main className="loading">Authenticating secure study session…</main>;
}

export function LogoutButton() {
  const router = useRouter();
  return <button className="textButton" onClick={async () => { const csrf = await fetch("/api/csrf", { credentials: "include" }).then(r => r.json()); await fetch("/api/auth/logout", { method: "POST", headers: { "X-CSRF-Token": csrf.csrf_token }, credentials: "include" }); router.replace("/login"); }}>Sign out</button>;
}
