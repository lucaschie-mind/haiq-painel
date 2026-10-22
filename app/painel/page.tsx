"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Topo, Metrica, B, CARD, H2, INP } from "../ui";

interface Saldo {
  total: number; reservados: number; consumidos: number;
  iniciados: number; concluidos: number; livre: number;
  tenantNome?: string | null;
}
interface Convite {
  id: string; email: string; nome: string | null; status: string;
  criadoEm: string; enviadoEm: string | null; iniciadoEm: string | null;
  concluidoEm: string | null; link: string; sessionId: string | null; haiqScore: number | null;
}

const ROTULO: Record<string, { txt: string; cor: string; bg: string }> = {
  PENDING:   { txt: "Não iniciou",           cor: "#854F0B", bg: "#FAEEDA" },
  STARTED:   { txt: "Iniciou, não concluiu", cor: "#0C447C", bg: "#E6F1FB" },
  COMPLETED: { txt: "Concluído",             cor: "#085041", bg: "#E1F5EE" },
};

export default function Page() {
  return (
    <Suspense fallback={<main style={{ padding: "4rem", textAlign: "center", color: "#666" }}>Carregando...</main>}>
      <Painel />
    </Suspense>
  );
}

function Painel() {
  const router = useRouter();

  // Admin pode abrir o painel de um cliente via ?tenant={id}.
  // Usuário comum ignora o parâmetro — a API só aceita o tenant dele.
  const tenantParam = useSearchParams().get("tenant");
  const q = tenantParam ? `?tenantId=${encodeURIComponent(tenantParam)}` : "";
  const [me, setMe]             = useState<{ nome: string; role: string; tenantNome: string | null; tenantId: string | null } | null>(null);
  const [saldo, setSaldo]       = useState<Saldo | null>(null);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [texto, setTexto]         = useState("");
  const [enviarEmail, setEnviar]  = useState(false);
  const [emailAtivo, setEmailAtivo] = useState(false);
  const [processando, setProc]    = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro]           = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [rMe, rSaldo, rConv] = await Promise.all([
      fetch("/api/me"), fetch(`/api/saldo${q}`), fetch(`/api/convites${q}`),
    ]);
    if (rMe.status === 401) { router.replace("/login"); return; }
    setMe(await rMe.json());
    setSaldo(await rSaldo.json());
    setConvites((await rConv.json()).convites ?? []);
    setCarregando(false);
  }, [router, q]);

  useEffect(() => { carregar(); }, [carregar]);

  function parsear(t: string) {
    return t.split(/[\n,;]+/).map(l => l.trim()).filter(Boolean).map(l => {
      // Aceita "Nome <email>", "email,Nome" ou só "email"
      const m = l.match(/^(.*?)[<\t]\s*([^\s<>]+@[^\s<>]+)\s*>?$/);
      if (m) return { nome: m[1].replace(/[,;]$/, "").trim() || undefined, email: m[2] };
      const partes = l.split(/\s{2,}/);
      if (partes.length === 2 && partes[1].includes("@")) return { nome: partes[0], email: partes[1] };
      return { email: l };
    });
  }

  const pendentes = parsear(texto);
  const excede = saldo ? pendentes.length > saldo.livre : false;

  async function criar() {
    setProc(true); setErro(null); setResultado(null);
    try {
      const r = await fetch("/api/convites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linhas: pendentes, enviarEmail, ...(tenantParam ? { tenantId: tenantParam } : {}) }),
      });
      const d = await r.json();
      if (!r.ok) { setErro(d.error); setResultado(d.validacao ? { rejeitados: d.validacao.rejeitados } : null); return; }
      setResultado(d); setEmailAtivo(d.emailAtivo); setTexto("");
      await carregar();
    } finally { setProc(false); }
  }

  async function cancelar(id: string, email: string) {
    if (!confirm(`Cancelar o convite de ${email} e devolver o crédito?`)) return;
    const r = await fetch(`/api/convites/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    await carregar();
  }

  if (carregando) return <main style={{ padding: "4rem", textAlign: "center", color: "#666" }}>Carregando...</main>;

  const modoAdmin = !!tenantParam && me?.role === "ADMIN";

  return (
    <main style={{ minHeight: "100vh" }}>
      <Topo nome={saldo?.tenantNome ?? me?.tenantNome ?? "Painel"} sub={me?.nome} />

      {modoAdmin && (
        <div style={{ background: "#FFF8E1", borderBottom: "1px solid #F3E0B5",
          padding: "9px 1.5rem", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#633806" }}>
            Você está vendo o painel como <strong>{saldo?.tenantNome ?? "este cliente"}</strong>.
            Tudo que fizer aqui vale para esse cliente.
          </span>
          <a href="/admin" style={{ fontSize: 12.5, fontWeight: 600, color: "#854F0B",
            textDecoration: "none", border: "1px solid #E8CC8E", borderRadius: 7,
            padding: "5px 12px", background: "#fff" }}>
            ← Voltar para administração
          </a>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

        {saldo && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <Metrica valor={saldo.livre}       rotulo="Créditos livres"        cor="#0F6E56" />
            <Metrica valor={saldo.reservados}  rotulo="Convidados, sem iniciar" cor="#854F0B" />
            <Metrica valor={saldo.iniciados}   rotulo="Em andamento"            cor="#185FA5" />
            <Metrica valor={saldo.concluidos}  rotulo="Concluídos"              cor="#534AB7" />
            <Metrica valor={saldo.total}       rotulo="Total contratado"        cor="#5F5E5A" />
          </div>
        )}

        {/* Convidar */}
        <div style={CARD}>
          <h2 style={H2}>Convidar pessoas</h2>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 .85rem" }}>
            Um e-mail por linha. Aceita também <code style={CODE}>Nome &lt;email@empresa.com&gt;</code>.
            Cada pessoa consome um crédito quando inicia o teste.
          </p>
          <textarea
            value={texto} onChange={(e) => setTexto(e.target.value)} rows={6}
            placeholder={"ana@empresa.com.br\nBruno Silva <bruno@empresa.com.br>\ncarla@gmail.com"}
            style={{ ...INP, width: "100%", resize: "vertical", fontFamily: "ui-monospace, monospace", fontSize: 13 }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: ".85rem" }}>
            <span style={{ fontSize: 13, color: excede ? "#993C1D" : "#555" }}>
              {pendentes.length} pessoa(s)
              {saldo && ` · ${saldo.livre} crédito(s) livre(s)`}
              {excede && " — excede o saldo"}
            </span>

            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#555", cursor: "pointer" }}>
              <input type="checkbox" checked={enviarEmail} onChange={(e) => setEnviar(e.target.checked)} />
              Enviar convite por e-mail
            </label>

            <button onClick={criar} disabled={processando || pendentes.length === 0 || excede}
              style={{ ...B.pri, ...(processando || pendentes.length === 0 || excede ? B.off : {}), marginLeft: "auto" }}>
              {processando ? "Criando..." : "Criar convites"}
            </button>
          </div>

          {erro && <div style={AVISO_ERRO}>{erro}</div>}

          {resultado?.rejeitados?.length > 0 && (
            <div style={AVISO_ATENCAO}>
              <strong>{resultado.rejeitados.length} linha(s) ignorada(s):</strong>
              <ul style={{ margin: ".4rem 0 0", paddingLeft: "1.1rem" }}>
                {resultado.rejeitados.slice(0, 8).map((r: any, i: number) => (
                  <li key={i} style={{ fontSize: 12.5, marginBottom: 2 }}>
                    {r.linha.email || "(vazio)"} — {r.motivo}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {resultado?.criados > 0 && (
            <div style={AVISO_OK}>
              <strong>{resultado.criados} convite(s) criado(s).</strong>
              {resultado.enviados > 0 && ` ${resultado.enviados} e-mail(s) enviado(s).`}
              {enviarEmail && !resultado.emailAtivo && " O envio de e-mail não está configurado — use a exportação para distribuir os links."}
              {resultado.falhasEnvio?.length > 0 && ` Falha no envio para: ${resultado.falhasEnvio.join(", ")}.`}
            </div>
          )}
        </div>

        {/* Lista */}
        <div style={CARD}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: "1rem" }}>
            <h2 style={{ ...H2, margin: 0 }}>Pessoas convidadas</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <a href={`/api/export/convites${q}`} style={{ ...B.sec, textDecoration: "none", display: "inline-block" }}>
                Exportar convites
              </a>
              <a href={`/api/export/resultados${q}`} style={{ ...B.sec, textDecoration: "none", display: "inline-block" }}>
                Exportar resultados
              </a>
            </div>
          </div>

          {convites.length === 0 ? (
            <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Nenhuma pessoa convidada ainda.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Pessoa", "Status", "HAI-Q", "Link", "Ações"].map(h => (
                      <th key={h} style={TH}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {convites.map(c => {
                    const r = ROTULO[c.status] ?? { txt: c.status, cor: "#555", bg: "#eee" };
                    return (
                      <tr key={c.id}>
                        <td style={TD}>
                          <div style={{ fontWeight: 600, color: "#222" }}>{c.nome || "—"}</div>
                          <div style={{ fontSize: 12, color: "#777" }}>{c.email}</div>
                        </td>
                        <td style={TD}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 11, background: r.bg, color: r.cor, whiteSpace: "nowrap" }}>
                            {r.txt}
                          </span>
                        </td>
                        <td style={{ ...TD, fontWeight: 600, color: "#185FA5" }}>
                          {c.haiqScore != null ? c.haiqScore.toFixed(1) : "—"}
                        </td>
                        <td style={TD}>
                          <button onClick={() => { navigator.clipboard.writeText(c.link); }}
                            style={{ ...B.sec, padding: "5px 11px", fontSize: 12 }}>
                            Copiar link
                          </button>
                        </td>
                        <td style={TD}>
                          {c.status === "PENDING" ? (
                            <button onClick={() => cancelar(c.id, c.email)} style={B.per}>
                              Cancelar
                            </button>
                          ) : c.sessionId && c.concluidoEm ? (
                            <a href={`${LINK_BASE_RH}${c.sessionId}`} target="_blank" rel="noreferrer"
                              style={{ ...B.sec, padding: "5px 11px", fontSize: 12, textDecoration: "none", display: "inline-block" }}>
                              Devolutiva
                            </a>
                          ) : <span style={{ fontSize: 12, color: "#aaa" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const LINK_BASE_RH = "/r/";
const CODE: React.CSSProperties = { background: "#f1f3f7", padding: "1px 5px", borderRadius: 4, fontFamily: "ui-monospace, monospace", fontSize: 12 };
const TH: React.CSSProperties = { textAlign: "left", padding: "9px 10px", borderBottom: "2px solid #eef2f7", fontSize: 12, fontWeight: 700, color: "#5F5E5A", textTransform: "uppercase", letterSpacing: .4 };
const TD: React.CSSProperties = { padding: "11px 10px", borderBottom: "1px solid #f3f6fa", verticalAlign: "middle" };
const AVISO_ERRO: React.CSSProperties     = { background: "#FCEBEB", borderLeft: "3px solid #E24B4A", borderRadius: "0 8px 8px 0", padding: "11px 14px", fontSize: 13, color: "#791F1F", marginTop: ".85rem", lineHeight: 1.6 };
const AVISO_ATENCAO: React.CSSProperties  = { background: "#FFF8E1", borderLeft: "3px solid #EF9F27", borderRadius: "0 8px 8px 0", padding: "11px 14px", fontSize: 13, color: "#633806", marginTop: ".85rem", lineHeight: 1.6 };
const AVISO_OK: React.CSSProperties       = { background: "#E1F5EE", borderLeft: "3px solid #0F6E56", borderRadius: "0 8px 8px 0", padding: "11px 14px", fontSize: 13, color: "#085041", marginTop: ".85rem", lineHeight: 1.6 };
