"use client";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [emailAtivo, setEmailAtivo] = useState(true);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      setEmailAtivo(d.emailAtivo !== false);
      setEnviado(true);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main style={S.main}>
      <div style={S.card}>
        <div style={S.header}>
          <div style={S.logo}>HAI-Q</div>
          <div style={S.sub}>Painel de gestão</div>
        </div>

        <div style={{ padding: "1.75rem 2rem 2rem" }}>
          {enviado ? (
            <>
              <h1 style={S.titulo}>Verifique seu e-mail</h1>
              <p style={S.texto}>
                Se <strong>{email}</strong> estiver cadastrado, enviamos um link de acesso.
                Ele vale por 30 minutos e funciona uma única vez.
              </p>
              {!emailAtivo && (
                <div style={S.aviso}>
                  <strong>Envio de e-mail não configurado.</strong><br />
                  O link foi gravado no log do servidor. No Railway, abra o serviço do
                  painel e procure por <code style={S.code}>[login] Link para</code>.
                </div>
              )}
              <button style={S.btnSec} onClick={() => { setEnviado(false); setEmail(""); }}>
                Usar outro e-mail
              </button>
            </>
          ) : (
            <>
              <h1 style={S.titulo}>Entrar</h1>
              <p style={S.texto}>
                Informe seu e-mail. Enviaremos um link de acesso — sem senha.
              </p>
              <form onSubmit={enviar}>
                <label style={S.label}>E-mail</label>
                <input
                  type="email" value={email} required disabled={carregando}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br" style={S.input}
                />
                <button type="submit" disabled={carregando || !email.trim()}
                  style={{ ...S.btn, ...(carregando || !email.trim() ? S.btnOff : {}) }}>
                  {carregando ? "Enviando..." : "Enviar link de acesso"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  main:   { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" },
  card:   { background: "#fff", borderRadius: 16, boxShadow: "0 2px 20px rgba(0,0,0,.08)", maxWidth: 420, width: "100%", overflow: "hidden" },
  header: { background: "#042C53", padding: "1.75rem 2rem" },
  logo:   { fontSize: 30, fontWeight: 700, color: "#378ADD", letterSpacing: 2 },
  sub:    { fontSize: 13, color: "#85B7EB", marginTop: 2 },
  titulo: { fontSize: 20, fontWeight: 600, color: "#042C53", margin: "0 0 .5rem" },
  texto:  { fontSize: 14, color: "#555", lineHeight: 1.65, margin: "0 0 1.25rem" },
  label:  { display: "block", fontSize: 13, fontWeight: 600, color: "#333", marginBottom: 6 },
  input:  { width: "100%", padding: "11px 14px", border: "1.5px solid #dde3ec", borderRadius: 8, fontSize: 15, boxSizing: "border-box", marginBottom: "1rem" },
  btn:    { width: "100%", padding: 13, background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" },
  btnOff: { background: "#b9c6d4", cursor: "not-allowed" },
  btnSec: { width: "100%", padding: 11, background: "transparent", color: "#555", border: "1.5px solid #dde3ec", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: "1rem" },
  aviso:  { background: "#FFF8E1", borderLeft: "3px solid #EF9F27", borderRadius: "0 8px 8px 0", padding: "12px 14px", fontSize: 13, color: "#5a4a20", lineHeight: 1.6, marginBottom: ".5rem" },
  code:   { background: "#f1f3f7", padding: "1px 5px", borderRadius: 4, fontFamily: "ui-monospace, monospace", fontSize: 12 },
};
