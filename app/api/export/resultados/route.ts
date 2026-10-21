import { NextRequest } from "next/server";
import { resolverTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { montarCSV, respostaCSV, dataHoraArquivo, formatarData } from "@/lib/export";
import { erro } from "@/lib/api";

const ASSESSMENT = process.env.ASSESSMENT_URL || "";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = resolverTenant(req.nextUrl.searchParams.get("tenantId"));
    const sessions = await prisma.session.findMany({
      where: { tenantId },
      orderBy: { startedAt: "desc" },
      include: { evaluation: true, _count: { select: { logs: true } } },
    });

    const base = ASSESSMENT.replace(/\/$/, "");
    const colunas = [
      "Nome","E-mail","Case","Iniciou em","Concluiu em","Duração (min)","Turnos",
      "HAI-Q","D1 Investigação","D2 Calibração","D3 Complementaridade","D4 Output",
      "Agência humana (%)","Classificação de agência","Gaps",
      "Parecer D1","Parecer D2","Parecer D3","Parecer D4","Nota de contexto",
      "Devolutiva candidato","Devolutiva RH",
    ];

    const linhas = sessions.map((s: any) => {
      const e = s.evaluation;
      return {
        "Nome": s.candidateName,
        "E-mail": s.candidateEmail,
        "Case": s.caseTitle,
        "Iniciou em": formatarData(s.startedAt),
        "Concluiu em": formatarData(s.completedAt),
        "Duração (min)": s.durationSeconds ? Math.round(s.durationSeconds / 60) : "",
        "Turnos": s._count.logs,
        "HAI-Q": e?.haiqScore ?? "",
        "D1 Investigação": e?.d1Score ?? "",
        "D2 Calibração": e?.d2Score ?? "",
        "D3 Complementaridade": e?.d3Score ?? "",
        "D4 Output": e?.d4Score ?? "",
        "Agência humana (%)": e?.humanAgencyPct != null ? Math.round(e.humanAgencyPct) : "",
        "Classificação de agência": e?.agencyClass ?? "",
        "Gaps": e?.gapLabels ?? "",
        "Parecer D1": e?.d1Parecer ?? "",
        "Parecer D2": e?.d2Parecer ?? "",
        "Parecer D3": e?.d3Parecer ?? "",
        "Parecer D4": e?.d4Parecer ?? "",
        "Nota de contexto": e?.contextNote ?? "",
        "Devolutiva candidato": s.completedAt ? `${base}/devolutiva/${s.id}` : "",
        "Devolutiva RH": s.completedAt ? `${base}/admin/devolutiva/${s.id}` : "",
      };
    });
    return respostaCSV(`haiq_resultados_${dataHoraArquivo()}.csv`, montarCSV(colunas, linhas));
  } catch (e) { return erro(e); }
}
