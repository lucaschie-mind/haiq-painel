"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function Verificar() {
  const sp = useSearchParams();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const token = sp.get("t");
    if (!token) { setErro("Link inválido."); return; }

    fetch("/api/auth/verificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setErro(d.error); return; }
        router.replace(d.role === "ADMIN" ? "/admin" : "/painel");
      })
      .catch(() => setErro("Não foi possível validar o link."));
  }, [sp, router]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "2.5rem 2rem", maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 2px 20px rgba(0,0,0,.08)" }}>
        {erro ? (
          <>
            <div style={{ fontSize: 40, marginBottom: "1rem" }}>⚠️</div>
            <h1 style={{ fontSize: 18, color: "#042C53", margin: "0 0 .6rem" }}>Não foi possível entrar</h1>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.6, margin: "0 0 1.25rem" }}>{erro}</p>
            <a href="/login" style={{ display: "inline-block", padding: "11px 22px", background: "#185FA5", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
              Solicitar novo link
            </a>
          </>
        ) : (
          <p style={{ fontSize: 15, color: "#555" }}>Validando seu acesso...</p>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return <Suspense fallback={<main style={{ padding: "4rem", textAlign: "center", color: "#555" }}>Carregando...</main>}><Verificar /></Suspense>;
}
