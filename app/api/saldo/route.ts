import { NextRequest, NextResponse } from "next/server";
import { resolverTenant } from "@/lib/auth";
import { saldoDoTenant } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { erro } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = resolverTenant(req.nextUrl.searchParams.get("tenantId"));
    const [saldo, tenant] = await Promise.all([
      saldoDoTenant(tenantId),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { nome: true, slug: true } }),
    ]);
    // tenantNome permite que o admin veja de qual cliente é o painel aberto
    return NextResponse.json({ ...saldo, tenantNome: tenant?.nome ?? null, tenantSlug: tenant?.slug ?? null });
  } catch (e) { return erro(e); }
}
