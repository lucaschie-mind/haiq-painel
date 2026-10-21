import { NextRequest, NextResponse } from "next/server";
import { resolverTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelarConvite, linkDoConvite } from "@/lib/credits";
import { enviarEmail, emailConvite, emailAtivo } from "@/lib/email";
import { erro } from "@/lib/api";

const ASSESSMENT = process.env.ASSESSMENT_URL || "";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const convite = await prisma.invite.findUnique({ where: { id: params.id } });
    if (!convite) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
    const { sessao, tenantId } = resolverTenant(convite.tenantId);
    await cancelarConvite(params.id, tenantId, sessao.userId);
    return NextResponse.json({ ok: true });
  } catch (e) { return erro(e); }
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const convite = await prisma.invite.findUnique({ where: { id: params.id }, include: { tenant: true } });
    if (!convite) return NextResponse.json({ error: "Convite não encontrado." }, { status: 404 });
    resolverTenant(convite.tenantId);
    if (!emailAtivo()) return NextResponse.json({ error: "Envio de e-mail não está configurado." }, { status: 400 });
    if (convite.status !== "PENDING") return NextResponse.json({ error: "Esta pessoa já iniciou o teste." }, { status: 400 });

    const link = linkDoConvite(convite.id, ASSESSMENT);
    const modelo = emailConvite(convite.nome, link, convite.tenant.nome);
    const r = await enviarEmail({ para: convite.email, paraNome: convite.nome ?? undefined, ...modelo });
    if (!r.enviado) return NextResponse.json({ error: r.motivo }, { status: 400 });

    await prisma.invite.update({ where: { id: convite.id }, data: { enviadoEm: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (e) { return erro(e); }
}
