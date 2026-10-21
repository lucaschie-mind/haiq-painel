import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { erro } from "@/lib/api";

export async function GET() {
  try {
    exigirAdmin();
    const tenants = await prisma.tenant.findMany({ orderBy: { nome: "asc" } });
    const saldos = await Promise.all(tenants.map(async (t: any) => {
      const [lotes, grupos] = await Promise.all([
        prisma.creditLot.aggregate({ where: { tenantId: t.id }, _sum: { quantidade: true } }),
        prisma.invite.groupBy({ by: ["status"], where: { tenantId: t.id }, _count: { _all: true } }),
      ]);
      const por = (s: string) => grupos.find((g: any) => g.status === s)?._count._all ?? 0;
      const total = lotes._sum.quantidade ?? 0;
      const reservados = por("PENDING");
      const consumidos = por("STARTED") + por("COMPLETED");
      return {
        id: t.id, slug: t.slug, nome: t.nome, ativo: t.ativo,
        reportConfig: t.reportConfig, criadoEm: t.criadoEm,
        total, reservados, consumidos, livre: total - reservados - consumidos,
      };
    }));
    return NextResponse.json({ tenants: saldos });
  } catch (e) { return erro(e); }
}

export async function POST(req: NextRequest) {
  try {
    exigirAdmin();
    const { nome, slug } = await req.json();
    if (!nome || !slug) return NextResponse.json({ error: "Informe nome e slug." }, { status: 400 });
    const limpo = String(slug).trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (await prisma.tenant.findUnique({ where: { slug: limpo } })) {
      return NextResponse.json({ error: "Já existe um cliente com este slug." }, { status: 400 });
    }
    const t = await prisma.tenant.create({ data: { nome: String(nome).trim(), slug: limpo } });
    return NextResponse.json({ tenant: t });
  } catch (e) { return erro(e); }
}
