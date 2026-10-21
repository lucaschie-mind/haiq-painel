import { NextRequest } from "next/server";
import { resolverTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { linkDoConvite } from "@/lib/credits";
import { montarCSV, respostaCSV, dataHoraArquivo, formatarData, ROTULO_STATUS } from "@/lib/export";
import { erro } from "@/lib/api";

const ASSESSMENT = process.env.ASSESSMENT_URL || "";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = resolverTenant(req.nextUrl.searchParams.get("tenantId"));
    const convites = await prisma.invite.findMany({
      where: { tenantId, status: { not: "CANCELED" } },
      orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
    });

    const colunas = ["Nome","E-mail","Status","Convite criado em","E-mail enviado em","Iniciou em","Concluiu em","Link do teste"];
    const linhas = convites.map((c: any) => ({
      "Nome": c.nome ?? "",
      "E-mail": c.email,
      "Status": ROTULO_STATUS[c.status] ?? c.status,
      "Convite criado em": formatarData(c.criadoEm),
      "E-mail enviado em": formatarData(c.enviadoEm),
      "Iniciou em": formatarData(c.iniciadoEm),
      "Concluiu em": formatarData(c.concluidoEm),
      "Link do teste": linkDoConvite(c.id, ASSESSMENT),
    }));
    return respostaCSV(`haiq_convites_${dataHoraArquivo()}.csv`, montarCSV(colunas, linhas));
  } catch (e) { return erro(e); }
}
