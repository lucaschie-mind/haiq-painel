"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Topo, Metrica, B, CARD, H2, INP } from "../ui";

interface Tenant {
  id: string; slug: string; nome: string; ativo: boolean;
  reportConfig: Record<string, boolean> | null;
  total: number; reservados: number; consumidos: number; livre: number;
}
interface Usuario {
  id: string; email: string; nome: string; role: string;
  tenantId: string | null; tenantNome: string | null; ultimoLogin: string | null;
}

const FLAGS: Array<{ k: string; rotulo: string }> = [
  { k: "mostrarMetodologia", rotulo: "Explicação do HAI-Q" },
  { k: "mostrarAgencia",     rotulo: "Índice de agência" },
  { k: "mostrarPareceres",   rotulo: "Pareceres por dimensão" },
  { k: "mostrarGaps",        rotulo: "Pontos de desenvolvimento" },
];

export default function Admin() {
  const router = useRouter();
  const [me, setMe] = useState<{ nome: string } | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<"clientes" | "usuarios">("clientes");

  const [novoNome, setNovoNome] = useState("");
  const [novoSlug, setNovoSlug] = useState("");
  const [uNome, setUNome]   = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uRole, setURole]   = useState("TENANT");
  const [uTenant, setUTenant] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; txt: string } | null>(null);

  const carregar = useCallback(async () => {
    const [rMe, rT, rU] = await Promise.all([
      fetch("/api/me"), fetch("/api/tenants"), fetch("/api/usuarios"),
    ]);
    if (rMe.status === 401) { router.replace("/login"); return; }
    if (rT.status === 403)  { router.replace("/painel"); return; }
    setMe(await rMe.json());
    setTenants((await rT.json()).tenants ?? []);
    setUsuarios((await rU.json()).usuarios ?? []);
    setCarregando(false);
  }, [router]);

  useEffect(() => { carregar(); }, [carregar]);

  async function criarTenant() {
    setMsg(null);
    const r = await fetch("/api/tenants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome, slug: novoSlug }),
    });
    const d = await r.json();
    if (!r.ok) { setMsg({ tipo: "erro", txt: d.error }); return; }
    setNovoNome(""); setNovoSlug(""); setMsg({ tipo: "ok", txt: "Cliente criado." });
    await carregar();
  }

  async function addCreditos(t: Tenant) {
    const q = prompt(`Quantos créditos adicionar para ${t.nome}?\n(use número negativo para estornar)`);
    if (!q) return;
    const nota = prompt("Referência da compra (opcional): proposta, NF, observação") ?? "";
    const r = await fetch(`/api/tenants/${t.id}/creditos`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantidade: Number(q), nota }),
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    await carregar();
  }

  async function toggleFlag(t: Tenant, flag: string) {
    const atual = t.reportConfig ?? {};
    const novo = { ...atual, [flag]: atual[flag] === false ? true : false };
    // Remove as que ficaram true — null significa "mostra tudo"
    const limpo: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(novo)) if (v === false) limpo[k] = false;

    const r = await fetch(`/api/tenants/${t.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportConfig: Object.keys(limpo).length ? limpo : null }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    await carregar();
  }

  async function criarUsuario() {
    setMsg(null);
    const r = await fetch("/api/usuarios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: uNome, email: uEmail, role: uRole, tenantId: uRole === "TENANT" ? uTenant : null }),
    });
    const d = await r.json();
    if (!r.ok) { setMsg({ tipo: "erro", txt: d.error }); return; }
    setUNome(""); setUEmail(""); setMsg({ tipo: "ok", txt: "Usuário criado. Ele já pode entrar pelo link mágico." });
    await carregar();
  }

  if (carregando) return <main style={{ padding: "4rem", textAlign: "center", color: "#666" }}>Carregando...</main>;

  const totaisGerais = tenants.reduce((a, t) => ({
    total: a.total + t.total, livre: a.livre + t.livre, consumidos: a.consumidos + t.consumidos,
  }), { total: 0, livre: 0, consumidos: 0 });

  return (
    <main style={{ minHeight: "100vh" }}>
      <Topo nome="Administração" sub={me?.nome} />

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <Metrica valor={tenants.length}          rotulo="Clientes"             cor="#534AB7" />
          <Metrica valor={totaisGerais.total}      rotulo="Créditos vendidos"    cor="#5F5E5A" />
          <Metrica valor={totaisGerais.consumidos} rotulo="Créditos consumidos"  cor="#185FA5" />
          <Metrica valor={totaisGerais.livre}      rotulo="Créditos em aberto"   cor="#0F6E56" />
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
          {(["clientes", "usuarios"] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                border: "1.5px solid " + (aba === a ? "#185FA5" : "#dde3ec"),
                background: aba === a ? "#185FA5" : "#fff",
                color: aba === a ? "#fff" : "#555" }}>
              {a === "clientes" ? "Clientes" : "Usuários"}
            </button>
          ))}
        </div>

        {msg && (
          <div style={{ padding: "11px 14px", borderRadius: 8, fontSize: 13, marginBottom: "1rem", lineHeight: 1.6,
            background: msg.tipo === "ok" ? "#E1F5EE" : "#FCEBEB",
            color:      msg.tipo === "ok" ? "#085041" : "#791F1F" }}>
            {msg.txt}
          </div>
        )}

        {aba === "clientes" && (
          <>
            <div style={CARD}>
              <h2 style={H2}>Novo cliente</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "2 1 220px" }}>
                  <label style={LBL}>Nome da empresa</label>
                  <input value={novoNome} onChange={e => setNovoNome(e.target.value)}
                    placeholder="Acme Consultoria" style={{ ...INP, width: "100%" }} />
                </div>
                <div style={{ flex: "1 1 160px" }}>
                  <label style={LBL}>Slug</label>
                  <input value={novoSlug} onChange={e => setNovoSlug(e.target.value)}
                    placeholder="acme" style={{ ...INP, width: "100%", fontFamily: "ui-monospace, monospace" }} />
                </div>
                <button onClick={criarTenant} disabled={!novoNome.trim() || !novoSlug.trim()}
                  style={{ ...B.pri, ...(!novoNome.trim() || !novoSlug.trim() ? B.off : {}) }}>
                  Criar
                </button>
              </div>
            </div>

            {tenants.map(t => (
              <div key={t.id} style={CARD}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#042C53" }}>{t.nome}</div>
                    <div style={{ fontSize: 12, color: "#888", fontFamily: "ui-monospace, monospace" }}>{t.slug}</div>
                  </div>
                  <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                    {[
                      { v: t.livre,      l: "livres",     c: "#0F6E56" },
                      { v: t.reservados, l: "reservados", c: "#854F0B" },
                      { v: t.consumidos, l: "usados",     c: "#185FA5" },
                      { v: t.total,      l: "total",      c: "#5F5E5A" },
                    ].map(x => (
                      <div key={x.l} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 19, fontWeight: 700, color: x.c, lineHeight: 1.1 }}>{x.v}</div>
                        <div style={{ fontSize: 11, color: "#999" }}>{x.l}</div>
                      </div>
                    ))}
                    <button onClick={() => addCreditos(t)} style={B.sec}>Lançar créditos</button>
                  </div>
                </div>

                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0f4f8" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5F5E5A", marginBottom: 8 }}>
                    Seções visíveis na devolutiva do candidato
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {FLAGS.map(f => {
                      const visivel = t.reportConfig?.[f.k] !== false;
                      return (
                        <button key={f.k} onClick={() => toggleFlag(t, f.k)}
                          style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
                            border: "1.5px solid " + (visivel ? "#9FE1CB" : "#f0d0c6"),
                            background: visivel ? "#E1F5EE" : "#FAECE7",
                            color: visivel ? "#085041" : "#993C1D" }}>
                          {visivel ? "✓ " : "✕ "}{f.rotulo}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {aba === "usuarios" && (
          <>
            <div style={CARD}>
              <h2 style={H2}>Novo usuário</h2>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 160px" }}>
                  <label style={LBL}>Nome</label>
                  <input value={uNome} onChange={e => setUNome(e.target.value)} style={{ ...INP, width: "100%" }} />
                </div>
                <div style={{ flex: "2 1 200px" }}>
                  <label style={LBL}>E-mail</label>
                  <input value={uEmail} onChange={e => setUEmail(e.target.value)} type="email" style={{ ...INP, width: "100%" }} />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={LBL}>Perfil</label>
                  <select value={uRole} onChange={e => setURole(e.target.value)} style={{ ...INP, width: "100%" }}>
                    <option value="TENANT">Cliente</option>
                    <option value="ADMIN">Admin Mindsight</option>
                  </select>
                </div>
                {uRole === "TENANT" && (
                  <div style={{ flex: "1 1 170px" }}>
                    <label style={LBL}>Cliente</label>
                    <select value={uTenant} onChange={e => setUTenant(e.target.value)} style={{ ...INP, width: "100%" }}>
                      <option value="">Selecione...</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                )}
                <button onClick={criarUsuario}
                  disabled={!uNome.trim() || !uEmail.trim() || (uRole === "TENANT" && !uTenant)}
                  style={{ ...B.pri, ...(!uNome.trim() || !uEmail.trim() || (uRole === "TENANT" && !uTenant) ? B.off : {}) }}>
                  Criar
                </button>
              </div>
            </div>

            <div style={CARD}>
              <h2 style={H2}>Usuários</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr>{["Nome", "E-mail", "Perfil", "Cliente", "Último acesso"].map(h =>
                    <th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {usuarios.map(u => (
                      <tr key={u.id}>
                        <td style={{ ...TD, fontWeight: 600 }}>{u.nome}</td>
                        <td style={TD}>{u.email}</td>
                        <td style={TD}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 11,
                            background: u.role === "ADMIN" ? "#EEEDFE" : "#E6F1FB",
                            color:      u.role === "ADMIN" ? "#3C3489" : "#0C447C" }}>
                            {u.role === "ADMIN" ? "Admin" : "Cliente"}
                          </span>
                        </td>
                        <td style={TD}>{u.tenantNome ?? "—"}</td>
                        <td style={{ ...TD, color: "#888", fontSize: 12 }}>
                          {u.ultimoLogin ? new Date(u.ultimoLogin).toLocaleString("pt-BR") : "nunca"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

const LBL: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#555", marginBottom: 5 };
const TH: React.CSSProperties = { textAlign: "left", padding: "9px 10px", borderBottom: "2px solid #eef2f7", fontSize: 12, fontWeight: 700, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: .4 };
const TD: React.CSSProperties = { padding: "11px 10px", borderBottom: "1px solid #f3f6fa", verticalAlign: "middle" };
