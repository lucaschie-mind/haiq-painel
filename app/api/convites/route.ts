import { NextRequest, NextResponse } from "next/server";
import { resolverTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saldoDoTenant, validarLista, criarConvites, linkDoConvite } from "@/lib/credits";
import { enviarEmail, emailConvite, emailAtivo } from "@/lib/email";
import { erro } from "@/lib/api";

const ASSESSMENT = process.env.ASSESSMENT_URL || "";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = resolverTenant(req.nextUrl.searchParams.get("tenantId"));
    const convites = await prisma.invite.findMany({
      where: { tenantId, status: { not: "CANCELED" } },
      orderBy: { criadoEm: "desc" },
      include: { session: { select: { id: true, completedAt: true, evaluation: { select: { haiqScore: true } } } } },
    });
    return NextResponse.json({
      convites: convites.map((c: any) => ({
        id: c.id, email: c.email, nome: c.nome, status: c.status,
        criadoEm: c.criadoEm, enviadoEm: c.enviadoEm, iniciadoEm: c.iniciadoEm,
        concluidoEm: c.concluidoEm, link: linkDoConvite(c.id, ASSESSMENT),
        sessionId: c.sessionId, haiqScore: c.session?.evaluation?.haiqScore ?? null,
      })),
    });
  } catch (e) { return erro(e); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId } = resolverTenant(body.tenantId);
    const linhas: Array<{ email: string; nome?: string }> = body.linhas ?? [];
    const enviarPorEmail: boolean = !!body.enviarEmail;

    if (!Array.isArray(linhas) || linhas.length === 0) {
      return NextResponse.json({ error: "Nenhuma pessoa informada." }, { status: 400 });
    }

    const [saldo, existentes, tenant] = await Promise.all([
      saldoDoTenant(tenantId),
      prisma.invite.findMany({ where: { tenantId, status: { not: "CANCELED" } }, select: { email: true } }),
      prisma.tenant.findUnique({ where: { id: tenantId } }),
    ]);

    const validacao = validarLista(linhas, existentes.map((e: any) => e.email), saldo.livre);

    if (!validacao.cabeNoSaldo) {
      return NextResponse.json({
        error: `Saldo insuficiente. Você tem ${saldo.livre} crédito(s) livre(s) e tentou convidar ${validacao.validos.length} pessoa(s).`,
        validacao,
      }, { status: 400 });
    }
    if (validacao.validos.length === 0) {
      return NextResponse.json({ error: "Nenhuma pessoa válida na lista.", validacao }, { status: 400 });
    }

    const { ids } = await criarConvites(tenantId, validacao.validos);

    let enviados = 0;
    const falhasEnvio: string[] = [];
    if (enviarPorEmail && emailAtivo()) {
      for (let i = 0; i < ids.length; i++) {
        const pessoa = validacao.validos[i];
        const link = linkDoConvite(ids[i], ASSESSMENT);
        const modelo = emailConvite(pessoa.nome ?? null, link, tenant?.nome ?? "Sua empresa");
        const r = await enviarEmail({ para: pessoa.email, paraNome: pessoa.nome, ...modelo });
        if (r.enviado) {
          enviados++;
          await prisma.invite.update({ where: { id: ids[i] }, data: { enviadoEm: new Date() } });
        } else { falhasEnvio.push(pessoa.email); }
      }
    }

    return NextResponse.json({
      criados: ids.length, enviados, falhasEnvio, emailAtivo: emailAtivo(),
      rejeitados: validacao.rejeitados,
      links: ids.map((id, i) => ({
        email: validacao.validos[i].email, nome: validacao.validos[i].nome ?? null,
        link: linkDoConvite(id, ASSESSMENT),
      })),
    });
  } catch (e) { return erro(e); }
}
