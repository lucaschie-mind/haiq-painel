import { NextRequest, NextResponse } from "next/server";
import { consumirToken, criarCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Token ausente." }, { status: 400 });
  const sessao = await consumirToken(token);
  if (!sessao) return NextResponse.json({ error: "Link inválido, expirado ou já utilizado. Solicite um novo." }, { status: 401 });
  criarCookie(sessao);
  return NextResponse.json({ ok: true, role: sessao.role });
}
