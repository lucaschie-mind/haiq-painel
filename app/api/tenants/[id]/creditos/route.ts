import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saldoDoTenant } from "@/lib/credits";
import { erro } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    exigirAdmin();
    const [lotes, saldo] = await Promise.all([
      prisma.creditLot.findMany({ where: { tenantId: params.id }, orderBy: { criadoEm: "desc" } }),
      saldoDoTenant(params.id),
    ]);
    return NextResponse.json({ lotes, saldo });
  } catch (e) { return erro(e); }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = exigirAdmin();
    const { quantidade, nota } = await req.json();
    const q = Number(quantidade);
    if (!Number.isInteger(q) || q === 0) {
      return NextResponse.json({ error: "Quantidade deve ser um inteiro diferente de zero. Use negativo para estorno." }, { status: 400 });
    }
    await prisma.creditLot.create({
      data: { tenantId: params.id, quantidade: q, nota: nota ?? null, criadoPor: sessao.userId },
    });
    return NextResponse.json({ saldo: await saldoDoTenant(params.id) });
  } catch (e) { return erro(e); }
}
