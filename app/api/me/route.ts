import { NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const s = sessaoAtual();
  if (!s) return NextResponse.json({ autenticado: false }, { status: 401 });
  let tenantNome: string | null = null;
  if (s.tenantId) {
    const t = await prisma.tenant.findUnique({ where: { id: s.tenantId } });
    tenantNome = t?.nome ?? null;
  }
  return NextResponse.json({ autenticado: true, nome: s.nome, email: s.email, role: s.role, tenantId: s.tenantId, tenantNome });
}
