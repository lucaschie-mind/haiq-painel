"use client";
import { useRouter } from "next/navigation";

export function Topo({ nome, sub, acao }: { nome: string; sub?: string; acao?: React.ReactNode }) {
  const router = useRouter();
  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <div style={{ background: "#042C53", padding: "1.1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#378ADD", letterSpacing: 2 }}>HAI-Q</div>
        <div style={{ fontSize: 13, color: "#9FE1CB", marginTop: 1 }}>{nome}{sub ? ` · ${sub}` : ""}</div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {acao}
        <button onClick={sair} style={{ padding: "7px 14px", background: "transparent", color: "#85B7EB", border: "1px solid rgba(255,255,255,.2)", borderRadius: 7, fontSize: 13, cursor: "pointer" }}>
          Sair
        </button>
      </div>
    </div>
  );
}

export function Metrica({ valor, rotulo, cor }: { valor: number | string; rotulo: string; cor: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "1rem 1.2rem", flex: "1 1 130px", border: "1px solid #e6ebf2" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: cor, lineHeight: 1.1 }}>{valor}</div>
      <div style={{ fontSize: 12, color: "#777", marginTop: 3 }}>{rotulo}</div>
    </div>
  );
}

export const B = {
  pri: { padding: "10px 18px", background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  sec: { padding: "9px 16px", background: "#fff", color: "#185FA5", border: "1.5px solid #cfdcea", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  per: { padding: "6px 12px", background: "#fff", color: "#993C1D", border: "1.5px solid #f0d0c6", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  off: { opacity: .45, cursor: "not-allowed" } as React.CSSProperties,
};

export const CARD: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "1.3rem 1.5rem", border: "1px solid #e6ebf2", marginBottom: "1rem" };
export const H2:   React.CSSProperties = { fontSize: 16, fontWeight: 700, color: "#042C53", margin: "0 0 1rem" };
export const INP:  React.CSSProperties = { padding: "9px 12px", border: "1.5px solid #dde3ec", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
